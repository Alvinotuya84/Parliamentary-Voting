import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Motion } from '../entities/motion.entity';

@Injectable()
export class MotionService {
  constructor(
    @InjectRepository(Motion)
    private motionRepository: Repository<Motion>,
  ) {}

  async findAll(): Promise<Motion[]> {
    return this.motionRepository.find();
  }

  async findOne(id: string): Promise<Motion> {
    const motion = await this.motionRepository.findOne({ where: { id } });
    if (!motion) {
      throw new NotFoundException(`Motion with ID ${id} not found`);
    }
    return motion;
  }

  async create(motionData: Partial<Motion>): Promise<Motion> {
    const motion = this.motionRepository.create(motionData);
    return this.motionRepository.save(motion);
  }

  async update(id: string, motionData: Partial<Motion>): Promise<Motion> {
    await this.motionRepository.update(id, motionData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.motionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Motion with ID ${id} not found`);
    }
  }

  async updateStatus(id: string, status: string): Promise<Motion> {
    const motion = await this.findOne(id);
    motion.status = status;
    return this.motionRepository.save(motion);
  }

  async updateSummary(id: string, summary: string): Promise<Motion> {
    const motion = await this.findOne(id);
    motion.summary = summary;
    return this.motionRepository.save(motion);
  }

  async findByStatus(status: string): Promise<Motion[]> {
    return this.motionRepository.find({ where: { status } });
  }
}
