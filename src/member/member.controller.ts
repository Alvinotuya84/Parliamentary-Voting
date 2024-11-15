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
import { AuthGuard } from '@nestjs/passport';
import { Member } from '../entities/member.entity';
import { MemberService } from './member.service';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  async findAll(): Promise<Member[]> {
    return this.memberService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Member> {
    return this.memberService.findOne(id);
  }

  @Post()
  async create(@Body() memberData: Partial<Member>): Promise<Member> {
    return this.memberService.create(memberData);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() memberData: Partial<Member>,
  ): Promise<Member> {
    return this.memberService.update(id, memberData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.memberService.remove(id);
  }

  @Post(':id/voice-print')
  async updateVoicePrint(
    @Param('id') id: string,
    @Body() data: { voicePrint: string },
  ): Promise<Member> {
    return this.memberService.updateVoicePrint(id, data.voicePrint);
  }

  @Get('constituency/:constituency')
  async findByConstituency(
    @Param('constituency') constituency: string,
  ): Promise<Member[]> {
    return this.memberService.findByConstituency(constituency);
  }
}
