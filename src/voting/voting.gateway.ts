import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VotingService } from './voting.service';
import { VotingEventsService } from './voting.events';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VotingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private votingEvents: VotingEventsService) {}
  onModuleInit() {
    // Subscribe to vote updates
    this.votingEvents.voteUpdate$.subscribe(({ motionId, voteData }) => {
      this.server.to(`motion-${motionId}`).emit('voteUpdate', voteData);
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinMotion')
  handleJoinMotion(client: Socket, motionId: string) {
    client.join(`motion-${motionId}`);
    return { event: 'joinedMotion', data: { motionId } };
  }

  @SubscribeMessage('leaveMotion')
  handleLeaveMotion(client: Socket, motionId: string) {
    client.leave(`motion-${motionId}`);
    return { event: 'leftMotion', data: { motionId } };
  }

  // Broadcast vote updates to all clients in the motion room
  broadcastVoteUpdate(motionId: string, voteData: any) {
    this.server.to(`motion-${motionId}`).emit('voteUpdate', voteData);
  }
}
