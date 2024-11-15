import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';
import * as natural from 'natural';
import OpenAI from 'openai';
import * as path from 'path';

interface IRecognizeResponse
  extends protos.google.cloud.speech.v1.IRecognizeResponse {}
interface IRecognizeRequest
  extends protos.google.cloud.speech.v1.IRecognizeRequest {}

@Injectable()
export class VoiceProcessorService {
  private speechClient: SpeechClient;
  private tokenizer: natural.WordTokenizer;
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const credentialsPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    // Resolve the path relative to project root if it's not absolute
    const resolvedPath = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.resolve(process.cwd(), credentialsPath);

    this.speechClient = new SpeechClient({
      keyFilename: resolvedPath,
    });

    this.tokenizer = new natural.WordTokenizer();

    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async onModuleInit() {
    try {
      // Verify credentials by making a test API call
      await this.speechClient.initialize();
      console.log('Google Speech credentials verified successfully');
    } catch (error) {
      console.error('Failed to initialize Google Speech client:', error);
      throw error; // This will prevent the application from starting if credentials are invalid
    }
  }

  private async speechToText(audioBuffer: Buffer): Promise<string> {
    const audio = {
      content: audioBuffer.toString('base64'),
    };

    const config = {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
    };

    const request = {
      audio,
      config,
    };

    try {
      const [response]: [IRecognizeResponse, IRecognizeRequest, {}] =
        await this.speechClient.recognize(request);

      if (!response.results || response.results.length === 0) {
        throw new Error('No speech recognition results');
      }

      return response.results
        .map((result) => {
          if (!result.alternatives || result.alternatives.length === 0) {
            return '';
          }
          return result.alternatives[0].transcript || '';
        })
        .filter((text) => text.length > 0)
        .join('\n');
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  async processVoice(audioBuffer: Buffer): Promise<{
    text: string;
    voteIntent: string;
    confidence: number;
  }> {
    const text = await this.speechToText(audioBuffer);

    const [nlpIntent, aiIntent] = await Promise.all([
      this.analyzeWithNLP(text),
      this.analyzeWithAI(text),
    ]);

    const finalIntent = this.combineIntents(nlpIntent, aiIntent);

    return {
      text,
      voteIntent: finalIntent.intent,
      confidence: finalIntent.confidence,
    };
  }

  private async analyzeWithNLP(
    text: string,
  ): Promise<{ intent: string; confidence: number }> {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());

    const yesKeywords = ['yes', 'aye', 'agree', 'approve', 'support', 'favor'];
    const noKeywords = [
      'no',
      'nay',
      'disagree',
      'disapprove',
      'oppose',
      'against',
    ];

    let yesScore = 0;
    let noScore = 0;

    tokens.forEach((token) => {
      if (yesKeywords.includes(token)) yesScore++;
      if (noKeywords.includes(token)) noScore++;
    });

    const totalScore = yesScore + noScore;
    if (totalScore === 0) {
      return { intent: 'unclear', confidence: 0 };
    }

    return {
      intent: yesScore > noScore ? 'yes' : 'no',
      confidence: Math.abs(yesScore - noScore) / totalScore,
    };
  }

  private async analyzeWithAI(
    text: string,
  ): Promise<{ intent: string; confidence: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Analyze the following text and determine if it\'s a \'yes\' or \'no\' vote. Respond with JSON only in format: {"intent": "yes|no|unclear", "confidence": 0-1}',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0,
    });

    try {
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return { intent: 'unclear', confidence: 0 };
    }
  }

  private combineIntents(
    nlpResult: { intent: string; confidence: number },
    aiResult: { intent: string; confidence: number },
  ): { intent: string; confidence: number } {
    if (nlpResult.intent === aiResult.intent) {
      return {
        intent: nlpResult.intent,
        confidence: Math.max(nlpResult.confidence, aiResult.confidence),
      };
    }

    return nlpResult.confidence > aiResult.confidence ? nlpResult : aiResult;
  }
}
