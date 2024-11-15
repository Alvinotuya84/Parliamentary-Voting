import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class VotingEventsService {
  private voteUpdateSubject = new Subject<{
    motionId: string;
    voteData: any;
  }>();

  voteUpdate$ = this.voteUpdateSubject.asObservable();

  broadcastVoteUpdate(motionId: string, voteData: any) {
    this.voteUpdateSubject.next({ motionId, voteData });
  }
}
