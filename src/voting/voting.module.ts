import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { VotingGateway } from './voting.gateway';
import { Vote } from '../entities/vote.entity';
import { Motion } from '../entities/motion.entity';
import { Member } from '../entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Motion, Member])],
  controllers: [VotingController],
  providers: [VotingService, VotingGateway],
  exports: [VotingService],
})
export class VotingModule {}
