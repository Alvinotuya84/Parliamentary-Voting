import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { VotingService } from './voting.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('voting')
@UseGuards(AuthGuard('jwt'))
export class VotingController {
  constructor(private votingService: VotingService) {}

  @Post('cast-vote')
  async castVote(
    @Body() voteData: { voiceData: string; motionId: string; memberId: string },
  ) {
    return this.votingService.processVote(
      voteData.voiceData,
      voteData.motionId,
      voteData.memberId,
    );
  }

  @Get('statistics/:motionId')
  async getStatistics(@Param('motionId') motionId: string) {
    return this.votingService.getVoteStatistics(motionId);
  }
}
