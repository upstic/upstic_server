import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { JobOfferService } from '../services/job-offer.service';
import { CreateJobOfferDto, UpdateJobOfferDto, JobOfferResponseDto } from '../dtos/job-offer.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../models/User';
import { IJobOffer } from '../interfaces/job-offer.interface';

@Controller('job-offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobOfferController {
  constructor(private readonly jobOfferService: JobOfferService) {}

  @Post()
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async create(@Body() createJobOfferDto: CreateJobOfferDto, @Req() req: any): Promise<IJobOffer> {
    // Set the creator to the current user if not provided
    if (!createJobOfferDto.createdBy) {
      createJobOfferDto.createdBy = req.user.id;
    }
    
    return this.jobOfferService.createJobOffer(createJobOfferDto);
  }

  @Get()
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async findAll(@Query() query: any): Promise<IJobOffer[]> {
    return this.jobOfferService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.WORKER, UserRole.RECRUITER, UserRole.ADMIN)
  async findOne(@Param('id') id: string, @Req() req: any): Promise<IJobOffer> {
    const jobOffer = await this.jobOfferService.findById(id);
    
    // Check if the user is authorized to view this offer
    if (
      req.user.role === UserRole.WORKER && 
      jobOffer.candidateId.toString() !== req.user.id
    ) {
      throw new Error('Unauthorized to view this job offer');
    }
    
    return jobOffer;
  }

  @Get('candidate/:candidateId')
  @Roles(UserRole.WORKER, UserRole.RECRUITER, UserRole.ADMIN)
  async findByCandidate(@Param('candidateId') candidateId: string, @Req() req: any): Promise<IJobOffer[]> {
    // Workers can only view their own offers
    if (req.user.role === UserRole.WORKER && candidateId !== req.user.id) {
      throw new Error('Unauthorized to view these job offers');
    }
    
    return this.jobOfferService.findByCandidate(candidateId);
  }

  @Get('job/:jobId')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async findByJob(@Param('jobId') jobId: string): Promise<IJobOffer[]> {
    return this.jobOfferService.findByJob(jobId);
  }

  @Put(':id')
  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  async update(
    @Param('id') id: string, 
    @Body() updateJobOfferDto: UpdateJobOfferDto,
    @Req() req: any
  ): Promise<IJobOffer> {
    // Set the updater to the current user if not provided
    if (!updateJobOfferDto.updatedBy) {
      updateJobOfferDto.updatedBy = req.user.id;
    }
    
    return this.jobOfferService.update(id, updateJobOfferDto);
  }

  @Put(':id/respond')
  @Roles(UserRole.WORKER)
  async respondToOffer(
    @Param('id') id: string, 
    @Body() response: JobOfferResponseDto,
    @Req() req: any
  ): Promise<IJobOffer> {
    // Set the responder to the current user
    response.updatedBy = req.user.id;
    
    // Verify the offer belongs to this worker
    const offer = await this.jobOfferService.findById(id);
    if (offer.candidateId.toString() !== req.user.id) {
      throw new Error('Unauthorized to respond to this job offer');
    }
    
    return this.jobOfferService.respondToOffer(id, response);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.jobOfferService.delete(id);
  }
} 