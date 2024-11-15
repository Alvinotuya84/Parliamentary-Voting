import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MotionService } from './motion.service';
import { AuthGuard } from '@nestjs/passport';
import { Motion } from '../entities/motion.entity';

@Controller('motions')
@UseGuards(AuthGuard('jwt'))
export class MotionController {
  constructor(private readonly motionService: MotionService) {}

  @Get()
  async findAll(): Promise<Motion[]> {
    return this.motionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Motion> {
    return this.motionService.findOne(id);
  }

  @Post()
  async create(@Body() motionData: Partial<Motion>): Promise<Motion> {
    return this.motionService.create(motionData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() motionData: Partial<Motion>,
  ): Promise<Motion> {
    return this.motionService.update(id, motionData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.motionService.remove(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
  ): Promise<Motion> {
    return this.motionService.updateStatus(id, data.status);
  }

  @Post(':id/summary')
  async updateSummary(
    @Param('id') id: string,
    @Body() data: { summary: string },
  ): Promise<Motion> {
    return this.motionService.updateSummary(id, data.summary);
  }

  @Get('active/all')
  async findActiveMotions(): Promise<Motion[]> {
    return this.motionService.findByStatus('active');
  }
}
