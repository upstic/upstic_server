import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsString, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details' })
  error: string;

  @ApiProperty({ description: 'Request path' })
  path: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Validation errors',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  validationErrors: Array<{
    field: string;
    message: string;
  }>;
}

export class PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class SortingParamsDto {
  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'List of items' })
  items: T[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  pages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response status', enum: ['success', 'error'] })
  status: 'success' | 'error';

  @ApiProperty({ description: 'Response message' })
  message?: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Response metadata' })
  meta?: {
    [key: string]: any;
  };
}

export enum FilterOperator {
  EQ = 'eq',      // equals
  NE = 'ne',      // not equals
  GT = 'gt',      // greater than
  GTE = 'gte',    // greater than or equals
  LT = 'lt',      // less than
  LTE = 'lte',    // less than or equals
  IN = 'in',      // in array
  NIN = 'nin',    // not in array
  LIKE = 'like',  // contains
  REGEX = 'regex' // regular expression
}

export class FilterConditionDto {
  @ApiProperty({
    description: 'Field to filter on',
    example: 'status'
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Filter operator',
    enum: FilterOperator,
    example: FilterOperator.EQ
  })
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @ApiProperty({
    description: 'Filter value',
    example: 'OPEN'
  })
  value: any;
}

export class FilteringParamsDto {
  @ApiPropertyOptional({
    description: 'Filter conditions',
    type: [FilterConditionDto],
    example: [{
      field: 'status',
      operator: FilterOperator.EQ,
      value: 'OPEN'
    }]
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];

  @ApiPropertyOptional({
    description: 'Search text across multiple fields',
    example: 'developer'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Fields to search in',
    type: [String],
    example: ['title', 'description']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchFields?: string[];
} 