import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';
import * as natural from 'natural';
import OpenAI from 'openai';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs-node';

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
      encoding: 'WEBM_OPUS' as const,
      languageCode: 'en-US',
      model: 'default',

      sampleRateHertz: 48000,
    };

    const request = {
      audio,
      config,
    };

    try {
      console.log('Sending request to Google Speech API...');
      const [response] = await this.speechClient.recognize(request);
      console.log('Response:', JSON.stringify(response, null, 2));

      if (!response.results?.length) {
        throw new Error('No speech recognition results');
      }

      return response.results
        .map((result) => result.alternatives?.[0]?.transcript || '')
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      console.error('Speech recognition error:', error);
      throw error;
    }
  }

  async compareVoicePrints(
    storedPrint: string,
    currentPrint: string,
  ): Promise<number> {
    const storedFeatures = await this.extractFeatures(
      Buffer.from(storedPrint, 'base64'),
    );
    const currentFeatures = await this.extractFeatures(
      Buffer.from(currentPrint, 'base64'),
    );
    return this.cosineSimilarity(storedFeatures, currentFeatures);
  }

  private async extractFeatures(audioBuffer: Buffer): Promise<Float32Array> {
    const audioData = this.decodeAudioBuffer(audioBuffer);
    const features = await this.computeSpectralFeatures(audioData);
    return features;
  }

  private decodeAudioBuffer(buffer: Buffer): Float32Array {
    // Convert webm audio to PCM samples
    // This is a simplified version - you might need a proper audio decoder
    const array = new Uint8Array(buffer);
    return new Float32Array(array.map((x) => (x - 128) / 128));
  }

  private async computeSpectralFeatures(
    audioData: Float32Array,
  ): Promise<Float32Array> {
    const tensor = tf.tensor1d(audioData);
    const frameSize = 2048;
    const hopSize = 512;
    const frames = this.getFrames(audioData, frameSize, hopSize);

    // Compute power spectrum for each frame
    const spectralFeatures = [];
    for (const frame of frames) {
      const frameTensor = tf.tensor1d(frame);
      const spectrum = tf.spectral.rfft(frameTensor);
      const magnitude = tf.abs(spectrum);
      const powers = await magnitude.data();
      spectralFeatures.push(...Array.from(powers));
      tf.dispose([frameTensor, spectrum, magnitude]);
    }

    tf.dispose(tensor);
    return new Float32Array(spectralFeatures);
  }

  private getFrames(
    signal: Float32Array,
    frameSize: number,
    hopSize: number,
  ): Float32Array[] {
    const frames: Float32Array[] = [];
    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      frames.push(signal.slice(i, i + frameSize));
    }
    return frames;
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    const minLength = Math.min(a.length, b.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
