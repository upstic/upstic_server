import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsArray, Max, MaxLength, Min } from "class-validator";

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Rating score', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Detailed feedback' })
  @IsString()
  @MaxLength(1000)
  comment: string;

  @ApiProperty({ description: 'Feedback categories' })
  @IsArray()
  @IsString({ each: true })
  categories: string[];
} 