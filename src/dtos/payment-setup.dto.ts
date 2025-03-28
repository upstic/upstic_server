import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

export class PaymentSetupDto {
  @ApiProperty({ description: 'Payment method type (e.g., card, bank)' })
  @IsString()
  paymentMethodType: string;

  @ApiProperty({ description: 'Payment method details' })
  @IsObject()
  paymentDetails: Record<string, any>;
} 