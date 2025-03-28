import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RatingService } from '../services/rating.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RatingCategory, RatingSource, RatingStatus, RatingVisibility, IRatingScore } from '../models/Rating';
import { AuthRequest } from '../interfaces/auth-request.interface';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRating(
    @Body() createRatingDto: {
      scores: IRatingScore[];
      comment: string;
      jobId?: string;
      workerId?: string;
      clientId?: string;
      shiftId?: string;
      timesheetId?: string;
      source: RatingSource;
      visibility?: RatingVisibility;
      tags?: string[];
      improvementSuggestions?: string;
      strengths?: string[];
    },
    @Req() req: AuthRequest
  ) {
    return this.ratingService.createRating(createRatingDto, req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRatingById(@Param('id') id: string) {
    return this.ratingService.getRatingById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateRating(
    @Param('id') id: string,
    @Body() updateRatingDto: {
      scores?: IRatingScore[];
      comment?: string;
      visibility?: RatingVisibility;
      tags?: string[];
      improvementSuggestions?: string;
      strengths?: string[];
    },
    @Req() req: AuthRequest
  ) {
    return this.ratingService.updateRating(id, updateRatingDto, req.user.userId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publishRating(
    @Param('id') id: string,
    @Req() req: AuthRequest
  ) {
    return this.ratingService.publishRating(id, req.user.userId);
  }

  @Post(':id/dispute')
  @UseGuards(JwtAuthGuard)
  async disputeRating(
    @Param('id') id: string,
    @Body() disputeDto: { reason: string },
    @Req() req: AuthRequest
  ) {
    return this.ratingService.disputeRating(id, disputeDto.reason, req.user.userId);
  }

  @Post(':id/resolve-dispute')
  @UseGuards(JwtAuthGuard)
  async resolveDispute(
    @Param('id') id: string,
    @Body() resolutionDto: {
      action: 'keep' | 'modify' | 'delete';
      modifiedScores?: IRatingScore[];
      modifiedComment?: string;
    },
    @Req() req: AuthRequest
  ) {
    return this.ratingService.resolveDispute(id, resolutionDto, req.user.userId);
  }

  @Post(':id/response')
  @UseGuards(JwtAuthGuard)
  async addResponse(
    @Param('id') id: string,
    @Body() responseDto: {
      content: string;
      isPublic?: boolean;
    },
    @Req() req: AuthRequest
  ) {
    return this.ratingService.addResponse(id, responseDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteRating(
    @Param('id') id: string,
    @Req() req: AuthRequest
  ) {
    return this.ratingService.deleteRating(id, req.user.userId);
  }

  @Get('entity/:type/:id')
  @UseGuards(JwtAuthGuard)
  async getRatingsForEntity(
    @Param('type') entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    @Param('id') entityId: string,
    @Query('status') status?: RatingStatus,
    @Query('source') source?: RatingSource,
    @Query('minScore') minScore?: number,
    @Query('maxScore') maxScore?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.ratingService.getRatingsForEntity(entityType, entityId, {
      status,
      source,
      minScore,
      maxScore,
      limit,
      skip,
      sortBy,
      sortOrder
    });
  }

  @Get('entity/:type/:id/average')
  @UseGuards(JwtAuthGuard)
  async getAverageRatingForEntity(
    @Param('type') entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    @Param('id') entityId: string
  ) {
    return {
      averageRating: await this.ratingService.getAverageRatingForEntity(entityType, entityId)
    };
  }

  @Get('entity/:type/:id/statistics')
  @UseGuards(JwtAuthGuard)
  async getRatingStatisticsForEntity(
    @Param('type') entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    @Param('id') entityId: string
  ) {
    return this.ratingService.getRatingStatisticsForEntity(entityType, entityId);
  }

  @Get('categories')
  getRatingCategories() {
    return Object.values(RatingCategory);
  }

  @Get('sources')
  getRatingSources() {
    return Object.values(RatingSource);
  }

  @Get('statuses')
  getRatingStatuses() {
    return Object.values(RatingStatus);
  }

  @Get('visibilities')
  getRatingVisibilities() {
    return Object.values(RatingVisibility);
  }
} 