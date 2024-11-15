import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from '../entities/vote.entity';
import { Motion } from '../entities/motion.entity';
import { Member } from '../entities/member.entity';
import { VotingGateway } from './voting.gateway';
import { VoiceProcessorService } from './voice-processor.service';
import { VotingEventsService } from './voting.events';

@Injectable()
export class VotingService {
  constructor(
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Motion)
    private motionRepository: Repository<Motion>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private votingEvents: VotingEventsService,
    private voiceProcessorService: VoiceProcessorService,
  ) {}

  async processVote(voiceData: string, motionId: string, memberId: string) {
    const voteIntent = await this.processVoiceVote(voiceData);

    const vote = await this.createVote({
      member: await this.memberRepository.findOne({ where: { id: memberId } }),
      motion: await this.motionRepository.findOne({ where: { id: motionId } }),
      vote: voteIntent,
      voiceRecording: voiceData,
    });

    const voteStats = await this.getVoteStatistics(motionId);
    this.votingEvents.broadcastVoteUpdate(motionId, voteStats);

    return vote;
  }

  async createVote(voteData: Partial<Vote>): Promise<Vote> {
    if (!voteData.member || !voteData.motion) {
      throw new NotFoundException('Member or Motion not found');
    }

    const existingVote = await this.voteRepository.findOne({
      where: {
        member: { id: voteData.member.id },
        motion: { id: voteData.motion.id },
      },
    });

    if (existingVote) {
      existingVote.vote = voteData.vote;
      existingVote.voiceRecording = voteData.voiceRecording;
      return this.voteRepository.save(existingVote);
    }

    const vote = this.voteRepository.create(voteData);
    return this.voteRepository.save(vote);
  }

  private async processVoiceVote(voiceData: string): Promise<string> {
    try {
      const voiceBuffer = Buffer.from(voiceData, 'base64');
      const result = await this.voiceProcessorService.processVoice(voiceBuffer);

      if (result.confidence < 0.7) {
        throw new Error(
          `Vote intent unclear - confidence (${result.confidence}) too low`,
        );
      }

      if (!['yes', 'no'].includes(result.voteIntent)) {
        throw new Error(`Invalid vote intent: ${result.voteIntent}`);
      }

      return result.voteIntent;
    } catch (error) {
      throw new Error(`Failed to process voice vote: ${error.message}`);
    }
  }

  async getVoteStatistics(motionId: string) {
    const votes = await this.voteRepository.find({
      where: { motion: { id: motionId } },
      relations: ['member'],
    });

    return {
      total: votes.length,
      yes: votes.filter((v) => v.vote === 'yes').length,
      no: votes.filter((v) => v.vote === 'no').length,
      byConstituency: this.aggregateVotesByConstituency(votes),
    };
  }

  private aggregateVotesByConstituency(votes: Vote[]) {
    const constituencyVotes = {};
    votes.forEach((vote) => {
      const constituency = vote.member.constituency;
      if (!constituencyVotes[constituency]) {
        constituencyVotes[constituency] = { yes: 0, no: 0 };
      }
      constituencyVotes[constituency][vote.vote]++;
    });
    return constituencyVotes;
  }
}
