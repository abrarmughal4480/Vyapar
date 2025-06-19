import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('business-summary/:businessId')
  async getBusinessSummary(@Param('businessId') businessId: string) {
    return this.reportsService.getBusinessSummary(businessId);
  }

  @Get('monthly-income/:businessId')
  async getMonthlyIncome(
    @Param('businessId') businessId: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getMonthlyIncome(
      businessId,
      year ? parseInt(year) : new Date().getFullYear(),
    );
  }

  @Get('top-products/:businessId')
  async getTopProducts(
    @Param('businessId') businessId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopProducts(businessId, limit ? parseInt(limit) : 5);
  }

  @Get('sales-analytics/:businessId')
  async getSalesAnalytics(@Param('businessId') businessId: string) {
    return this.reportsService.getSalesAnalytics(businessId);
  }

  @Get('cash-flow/:businessId')
  async getCashFlow(@Param('businessId') businessId: string) {
    return this.reportsService.getCashFlow(businessId);
  }
}

