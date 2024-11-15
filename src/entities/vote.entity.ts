import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Motion } from './motion.entity';

@Entity()
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member)
  member: Member;

  @ManyToOne(() => Motion)
  motion: Motion;

  @Column()
  vote: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  voiceRecording: string;
}
