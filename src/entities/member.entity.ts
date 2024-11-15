import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  constituency: string;

  @Column({ nullable: true })
  voicePrint: string;

  @Column()
  role: string;

  @Column({ default: true })
  isActive: boolean;
}
