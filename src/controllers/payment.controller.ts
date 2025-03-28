import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PaymentSetupDto, PayoutRequestDto } from '../dtos/payment.dto';
import { PaginationParamsDto } from '../dtos/pagination-params.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  @Post('setup')
  @ApiOperation({ summary: 'Setup payment method' })
  setupPayment(@Body() dto: PaymentSetupDto) {}

  @Get('methods')
  @ApiOperation({ summary: 'Get payment methods' })
  getPaymentMethods() {}

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  getInvoices(@Query() query: PaginationParamsDto) {}

  @Post('payout-request')
  @ApiOperation({ summary: 'Request payout' })
  requestPayout(@Body() dto: PayoutRequestDto) {}
} 