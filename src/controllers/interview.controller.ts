import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InterviewService } from '../services/interview.service';
import { 
  ScheduleInterviewDto, 
  RescheduleInterviewDto, 
  InterviewFeedbackDto 
} from '../dtos/interview.dto';
import { CalendarQueryDto } from '../dtos/calendar.dto';

@ApiTags('Interviews')
@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule interview' })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  async scheduleInterview(@Body() dto: ScheduleInterviewDto) {
    return this.interviewService.scheduleInterview(dto);
  }

  @Put(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule interview' })
  @ApiResponse({ status: 200, description: 'Interview rescheduled successfully' })
  async rescheduleInterview(
    @Param('id') id: string, 
    @Body() dto: RescheduleInterviewDto
  ) {
    return this.interviewService.rescheduleInterview(id, dto);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit interview feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async submitFeedback(
    @Param('id') id: string, 
    @Body() dto: InterviewFeedbackDto
  ) {
    return this.interviewService.submitFeedback(id, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get interview calendar' })
  @ApiResponse({ status: 200, description: 'Calendar retrieved successfully' })
  async getCalendar(@Query() query: CalendarQueryDto) {
    return this.interviewService.getCalendar(query);
  }
} 