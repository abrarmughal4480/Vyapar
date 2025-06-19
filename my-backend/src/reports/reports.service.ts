import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getBusinessSummary(businessId: string) {
    try {
      const [
        totalIncome,
        totalExpenses,
        totalCustomers,
        totalProducts,
        totalQuotations,
        lastMonthIncome,
      ] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { businessId },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { businessId },
          _sum: { amount: true },
        }),
        this.prisma.customer.count({
          where: { businessId },
        }),
        this.prisma.product.count({
          where: { businessId },
        }),
        this.prisma.quotation.count({
          where: { businessId },
        }),
        this.prisma.sale.aggregate({
          where: {
            businessId,
            createdAt: {
              gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                1,
              ),
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const currentIncome = totalIncome._sum.amount || 0;
      const previousIncome = lastMonthIncome._sum.amount || 0;
      const expenses = totalExpenses._sum.amount || 0;
      const profit = currentIncome - expenses;
      const revenueGrowth =
        previousIncome > 0
          ? ((currentIncome - previousIncome) / previousIncome) * 100
          : 0;

      return {
        success: true,
        data: {
          totalIncome: currentIncome,
          totalExpenses: expenses,
          profit,
          totalCustomers,
          totalProducts,
          totalQuotations,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        },
      };
    } catch (error) {
      console.error('Error getting business summary:', error);
      return {
        success: false,
        message: 'Failed to get business summary',
        data: {
          totalIncome: 0,
          totalExpenses: 0,
          profit: 0,
          totalCustomers: 0,
          totalProducts: 0,
          totalQuotations: 0,
          revenueGrowth: 0,
        },
      };
    }
  }

  async getMonthlyIncome(businessId: string, year: number) {
    try {
      const monthlyData = await this.prisma.sale.groupBy({
        by: ['date'],
        where: {
          businessId,
          createdAt: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const monthlyIncome = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(year, i, 1).toLocaleString('default', {
          month: 'short',
        }),
        income: 0,
      }));

      monthlyData.forEach(record => {
        const month = new Date(record.date).getMonth();
        monthlyIncome[month].income += record._sum.amount || 0;
      });

      return {
        success: true,
        data: monthlyIncome,
      };
    } catch (error) {
      console.error('Error getting monthly income:', error);
      return {
        success: false,
        message: 'Failed to get monthly income',
        data: [],
      };
    }
  }

  async getTopProducts(businessId: string, limit: number = 10) {
    try {
      const topProducts = await this.prisma.purchaseItem.groupBy({
        by: ['productId'],
        where: {
          purchase: {
            businessId,
          },
        },
        _sum: {
          quantity: true,
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: limit,
      });

      const productsWithDetails = await Promise.all(
        topProducts.map(async item => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          return {
            name: product?.name || 'Unknown Product',
            sales: item._sum.amount || 0,
            quantity: item._sum.quantity || 0,
          };
        }),
      );

      return {
        success: true,
        data: productsWithDetails,
      };
    } catch (error) {
      console.error('Error getting top products:', error);
      return {
        success: false,
        message: 'Failed to get top products',
        data: [],
      };
    }
  }

  async getSalesAnalytics(businessId: string) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const [currentMonth, lastMonth] = await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            businessId,
            createdAt: { gte: startOfMonth }
          },
          _sum: { amount: true },
          _count: true
        }),
        this.prisma.sale.aggregate({
          where: {
            businessId,
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
          _sum: { amount: true },
          _count: true
        })
      ]);

      const currentTotal = currentMonth._sum.amount || 0;
      const lastTotal = lastMonth._sum.amount || 0;
      const salesGrowth = lastTotal > 0 ? 
        ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

      return {
        success: true,
        data: {
          currentMonthSales: currentTotal,
          lastMonthSales: lastTotal,
          currentMonthCount: currentMonth._count,
          lastMonthCount: lastMonth._count,
          salesGrowth: salesGrowth !== null ? Math.round(salesGrowth * 100) / 100 : 0
        }
      };
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      return {
        success: false,
        message: 'Failed to get sales analytics',
        data: null
      };
    }
  }

  async getCashFlow(businessId: string) {
    try {
      const [paymentsIn, paymentsOut] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            businessId,
            type: 'Payment In',
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            businessId,
            type: 'Payment Out',
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        success: true,
        data: {
          totalIn: paymentsIn._sum.amount || 0,
          totalOut: paymentsOut._sum.amount || 0,
          netCashFlow:
            (paymentsIn._sum.amount || 0) - (paymentsOut._sum.amount || 0),
        },
      };
    } catch (error) {
      console.error('Error getting cash flow:', error);
      return {
        success: false,
        message: 'Failed to get cash flow',
        data: null,
      };
    }
  }

  async getSalesReport(businessId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { businessId };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalSales,
      salesCount,
      averageSale,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
      this.prisma.sale.count({
        where: whereClause,
      }),
      this.prisma.sale.aggregate({
        where: whereClause,
        _avg: { amount: true },
      }),
    ]);

    return {
      totalSales: totalSales._sum.amount || 0,
      salesCount: salesCount,
      averageSale: averageSale._avg.amount || 0,
    };
  }

  async getPurchaseReport(businessId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { businessId };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalPurchases,
      purchaseCount,
      averagePurchase,
    ] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: whereClause,
        _sum: { total: true },
      }),
      this.prisma.purchase.count({
        where: whereClause,
      }),
      this.prisma.purchase.aggregate({
        where: whereClause,
        _avg: { total: true },
      }),
    ]);

    return {
      totalPurchases: totalPurchases._sum.total || 0,
      purchaseCount: purchaseCount,
      averagePurchase: averagePurchase._avg.total || 0,
    };
  }

  async getBusinessOverview(businessId: string) {
    const [
      totalCustomers,
      totalProducts,
      totalSales,
      totalPurchases,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { businessId } }),
      this.prisma.product.count({ where: { businessId } }),
      this.prisma.sale.aggregate({
        where: { businessId },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { businessId },
        _sum: { total: true },
      }),
    ]);

    return {
      totalCustomers,
      totalProducts,
      totalSales: totalSales._sum.amount || 0,
      totalPurchases: totalPurchases._sum.total || 0,
      profit: (totalSales._sum.amount || 0) - (totalPurchases._sum.total || 0),
    };
  }

  async getMonthlySalesData(businessId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const monthlyData = await this.prisma.sale.groupBy({
      by: ['date'],
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      sales: 0,
    }));

    monthlyData.forEach((data) => {
      const month = new Date(data.date).getMonth();
      months[month].sales += data._sum.amount || 0;
    });

    return months;
  }

  async getTopCustomers(businessId: string, limit: number = 10) {
    const topCustomers = await this.prisma.sale.groupBy({
      by: ['customer'],
      where: { businessId },
      _sum: {
        amount: true,
      },
      _count: {
        customer: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    return topCustomers.map(item => ({
      customerName: item.customer,
      totalAmount: item._sum.amount || 0,
      transactionCount: item._count.customer,
    }));
  }

  async getTopSuppliers(businessId: string, limit: number = 10) {
    const topSuppliers = await this.prisma.purchase.groupBy({
      by: ['supplier'],
      where: { businessId },
      _sum: {
        total: true,
      },
      _count: {
        supplier: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    return topSuppliers.map(item => ({
      supplierName: item.supplier,
      totalAmount: item._sum.total || 0,
      transactionCount: item._count.supplier,
    }));
  }

  async getProfitLossReport(businessId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { businessId };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalSales,
      totalPurchases,
      totalExpenses,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: whereClause,
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
    ]);

    const sales = totalSales._sum.amount || 0;
    const purchases = totalPurchases._sum.total || 0;
    const expenses = totalExpenses._sum.amount || 0;
    const grossProfit = sales - purchases;
    const netProfit = grossProfit - expenses;

    return {
      sales,
      purchases,
      expenses,
      grossProfit,
      netProfit,
      profitMargin: sales > 0 ? (netProfit / sales) * 100 : 0,
    };
  }

  async getInventoryReport(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        salePrice: true,
        purchasePrice: true,
        category: true,
      },
    });

    const totalItems = products.length;
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
    const totalValue = products.reduce((sum, product) => sum + (product.stock * (product.purchasePrice || 0)), 0);
    const lowStockItems = products.filter(product => product.stock < 10);

    return {
      totalItems,
      totalStock,
      totalValue,
      lowStockItems: lowStockItems.length,
      products: products.map(product => ({
        ...product,
        stockValue: product.stock * (product.purchasePrice || 0),
        profit: (product.salePrice - (product.purchasePrice || 0)) * product.stock,
      })),
    };
  }

  async getCashFlowReport(businessId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { businessId };
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate.toISOString().split('T')[0],
        lte: endDate.toISOString().split('T')[0],
      };
    }

    const [
      paymentsIn,
      paymentsOut,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ...whereClause,
          type: 'Payment In',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...whereClause,
          type: 'Payment Out',
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIn = paymentsIn._sum.amount || 0;
    const totalOut = paymentsOut._sum.amount || 0;
    const netCashFlow = totalIn - totalOut;

    return {
      totalIn,
      totalOut,
      netCashFlow,
      cashFlowStatus: netCashFlow >= 0 ? 'Positive' : 'Negative',
    };
  }

  async getExpenseReport(businessId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { businessId };
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalExpenses,
      expensesByCategory,
    ] = await Promise.all([
      this.prisma.expense.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: whereClause,
        _sum: { amount: true },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      }),
    ]);

    return {
      totalExpenses: totalExpenses._sum.amount || 0,
      expensesByCategory: expensesByCategory.map(item => ({
        category: item.category,
        amount: item._sum.amount || 0,
      })),
    };
  }
}

