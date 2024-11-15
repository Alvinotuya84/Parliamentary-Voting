import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VotingEventsService } from './voting.events';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket'],
})
export class VotingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VotingGateway.name);

  constructor(private votingEvents: VotingEventsService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  onModuleInit() {
    // Subscribe to vote updates
    this.votingEvents.voteUpdate$.subscribe(({ motionId, voteData }) => {
      this.server.to(`motion-${motionId}`).emit('voteUpdate', voteData);
    });

    // Subscribe to voting session updates
    this.votingEvents.votingSession$.subscribe(({ motionId, active }) => {
      this.server
        .to(`motion-${motionId}`)
        .emit('votingSessionUpdate', { active });
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinMotion')
  handleJoinMotion(client: Socket, motionId: string) {
    this.logger.log(`Client ${client.id} joining motion: ${motionId}`);
    client.join(`motion-${motionId}`);
    return { event: 'joinedMotion', data: { motionId } };
  }

  @SubscribeMessage('leaveMotion')
  handleLeaveMotion(client: Socket, motionId: string) {
    this.logger.log(`Client ${client.id} leaving motion: ${motionId}`);
    client.leave(`motion-${motionId}`);
    return { event: 'leftMotion', data: { motionId } };
  }

  @SubscribeMessage('startVoting')
  handleStartVoting(client: Socket, motionId: string) {
    this.votingEvents.updateVotingSession(motionId, true);
    return { event: 'votingStarted', data: { motionId } };
  }

  @SubscribeMessage('stopVoting')
  handleStopVoting(client: Socket, motionId: string) {
    this.votingEvents.updateVotingSession(motionId, false);
    return { event: 'votingStopped', data: { motionId } };
  }
}
