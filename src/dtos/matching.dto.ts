import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class MatchingOptionsDto {
  @ApiPropertyOptional({
    description: 'Minimum match score threshold (0-1)',
    minimum: 0,
    maximum: 1,
    default: 0.5,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 100,
    default: 10,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Whether to force refresh cached results',
    default: false,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include detailed match scores',
    default: false,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  includeScores?: boolean;
}

export class MatchResultDto {
  @ApiProperty({
    description: 'Overall match score (0-1)',
    minimum: 0,
    maximum: 1,
    type: Number
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Detailed scoring breakdown',
    type: 'object',
    additionalProperties: { type: 'number' }
  })
  details?: Record<string, number>;

  @ApiProperty({
    description: 'Match confidence level',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'HIGH'
  })
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class JobInsightsDto {
  @ApiProperty({
    description: 'Total number of potential matches',
    type: Number
  })
  totalMatches: number;

  @ApiProperty({
    description: 'Average match score',
    type: Number
  })
  averageScore: number;

  @ApiProperty({
    description: 'Most common matching criteria',
    type: [String]
  })
  topCriteria: string[];

  @ApiPropertyOptional({
    description: 'Suggested improvements for better matches',
    type: [String]
  })
  suggestions?: string[];
} 