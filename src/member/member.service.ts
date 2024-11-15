import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/member.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  async findAll(): Promise<Member[]> {
    return this.memberRepository.find();
  }

  async findOne(id: string): Promise<Member> {
    const member = await this.memberRepository.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
    return member;
  }

  async create(memberData: Partial<Member>): Promise<Member> {
    const member = this.memberRepository.create(memberData);
    return this.memberRepository.save(member);
  }

  async update(id: string, memberData: Partial<Member>): Promise<Member> {
    await this.memberRepository.update(id, memberData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.memberRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }
  }

  async updateVoicePrint(id: string, voicePrint: string): Promise<Member> {
    const member = await this.findOne(id);
    member.voicePrint = voicePrint;
    return this.memberRepository.save(member);
  }

  async findByConstituency(constituency: string): Promise<Member[]> {
    return this.memberRepository.find({ where: { constituency } });
  }
}
