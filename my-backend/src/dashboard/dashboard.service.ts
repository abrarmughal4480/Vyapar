import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  async getStats(businessId: string): Promise<any> {
    // Mock data - replace with actual database queries
    return {
      totalSales: 0,
      totalPurchases: 0,
      totalCustomers: 0,
      itemsInStock: 0,
      recentActivity: [],
      monthlyRevenue: Array(12).fill(0),
      topProducts: [],
      pendingPayments: 0
    };
  }
}
