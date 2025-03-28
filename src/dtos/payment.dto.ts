import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, Min } from 'class-validator';

export class PaymentSetupDto {
  @ApiProperty()
  @IsString()
  paymentMethodType: string;

  @ApiProperty()
  @IsObject()
  paymentDetails: Record<string, any>;
}

export class PayoutRequestDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  paymentMethodId: string;
} 