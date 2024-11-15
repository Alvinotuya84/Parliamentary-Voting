import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface VoteUpdateData {
  motionId: string;
  voteData: any;
}

@Injectable()
export class VotingEventsService {
  private voteUpdateSubject = new Subject<VoteUpdateData>();
  private votingSessionSubject = new Subject<{
    motionId: string;
    active: boolean;
  }>();

  voteUpdate$ = this.voteUpdateSubject.asObservable();
  votingSession$ = this.votingSessionSubject.asObservable();

  broadcastVoteUpdate(motionId: string, voteData: any) {
    this.voteUpdateSubject.next({ motionId, voteData });
  }

  updateVotingSession(motionId: string, active: boolean) {
    this.votingSessionSubject.next({ motionId, active });
  }
}
