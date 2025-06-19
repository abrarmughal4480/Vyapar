import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post(':businessId')
  create(@Param('businessId') businessId: string, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create({
      ...createTransactionDto,
      businessId,
    });
  }

  @Get()
  async findAll(@Query('businessId') businessId?: string) {
    return this.transactionsService.findAll(businessId);
  }

  @Get('summary/:businessId')
  async getTransactionSummary(@Param('businessId') businessId: string) {
    return this.transactionsService.getTransactionSummary(businessId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
