import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFeedbackDto } from '../dtos/feedback.dto';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  @Post('worker/:id')
  @ApiOperation({ summary: 'Submit worker feedback' })
  submitWorkerFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto) {}

  @Post('job/:id')
  @ApiOperation({ summary: 'Submit job feedback' })
  submitJobFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto) {}

  @Get('worker/:id')
  @ApiOperation({ summary: 'Get worker feedback' })
  getWorkerFeedback(@Param('id') id: string) {}

  @Get('job/:id')
  @ApiOperation({ summary: 'Get job feedback' })
  getJobFeedback(@Param('id') id: string) {}
} 