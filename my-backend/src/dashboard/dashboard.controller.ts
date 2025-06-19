import { Controller, Get, Param, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats/:businessId')
  async getStats(@Param('businessId') businessId: string) {
    try {
      const stats = await this.dashboardService.getStats(businessId);
      return {
        success: true,
        data: stats,
        message: 'Dashboard stats fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch stats'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
