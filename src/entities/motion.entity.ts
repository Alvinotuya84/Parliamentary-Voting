import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Motion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  proposedBy: string;

  @CreateDateColumn()
  dateProposed: Date;

  @Column({ default: 'pending' })
  status: string; // pending, active, completed

  @Column({ nullable: true })
  summary: string;
}
