import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get API info' })
  getApiInfo() {
    return {
      name: 'Recruitment Platform API',
      version: '1.0',
      description: 'API documentation for the recruitment platform'
    };
  }
} 