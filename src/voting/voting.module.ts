import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { VotingGateway } from './voting.gateway';
import { Vote } from '../entities/vote.entity';
import { Motion } from '../entities/motion.entity';
import { Member } from '../entities/member.entity';
import { VotingEventsService } from './voting.events';
import { VoiceProcessorService } from './voice-processor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Motion, Member])],
  controllers: [VotingController],
  providers: [
    VotingService,
    VotingGateway,
    VotingEventsService,
    VoiceProcessorService,
  ],
  exports: [VotingService],
})
export class VotingModule {}
