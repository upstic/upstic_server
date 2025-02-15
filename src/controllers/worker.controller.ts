import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiQuery 
} from '@nestjs/swagger';
import { WorkerService } from '../services/worker.service';
import { CreateWorkerDto, UpdateWorkerDto } from '../dtos/worker.dto';
import { 
  PaginationParamsDto, 
  SortingParamsDto, 
  PaginatedResponseDto,
  FilteringParamsDto 
} from '../dtos/common.dto';

@ApiTags('Workers')
@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workers' })
  @ApiResponse({ 
    status: 200, 
    description: 'Workers retrieved successfully',
    type: PaginatedResponseDto
  })
  async getAllWorkers(
    @Query() paginationParams: PaginationParamsDto,
    @Query() sortingParams: SortingParamsDto,
    @Query() filteringParams: FilteringParamsDto
  ) {
    return this.workerService.findAll(paginationParams, sortingParams, filteringParams);
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create worker',
    description: 'Create a new worker profile'
  })
  @ApiResponse({ status: 201, description: 'Worker created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid worker data' })
  @ApiBody({ type: CreateWorkerDto })
  async createWorker(@Body() workerData: CreateWorkerDto) {
    return this.workerService.create(workerData);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get worker by ID',
    description: 'Retrieve detailed information about a specific worker'
  })
  @ApiResponse({ status: 200, description: 'Worker found' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  async getWorker(@Param('id') id: string) {
    return this.workerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update worker',
    description: 'Update worker profile information'
  })
  @ApiResponse({ status: 200, description: 'Worker updated successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  @ApiBody({ type: UpdateWorkerDto })
  async updateWorker(
    @Param('id') id: string,
    @Body() workerData: UpdateWorkerDto
  ) {
    return this.workerService.update(id, workerData);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete worker',
    description: 'Delete a worker profile'
  })
  @ApiResponse({ status: 200, description: 'Worker deleted successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  async deleteWorker(@Param('id') id: string) {
    return this.workerService.delete(id);
  }

  @Get(':id/availability')
  @ApiOperation({ 
    summary: 'Get worker availability',
    description: 'Retrieve availability schedule for a worker'
  })
  @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  async getWorkerAvailability(@Param('id') id: string) {
    return this.workerService.getAvailability(id);
  }

  @Get(':id/applications')
  @ApiOperation({ 
    summary: 'Get worker applications',
    description: 'Retrieve all job applications for a worker'
  })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'id', description: 'Worker ID' })
  async getWorkerApplications(@Param('id') id: string) {
    return this.workerService.getApplications(id);
  }
} 