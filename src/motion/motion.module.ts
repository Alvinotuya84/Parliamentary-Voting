import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MotionController } from './motion.controller';
import { MotionService } from './motion.service';
import { Motion } from '../entities/motion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Motion])],
  controllers: [MotionController],
  providers: [MotionService],
  exports: [MotionService],
})
export class MotionModule {}
