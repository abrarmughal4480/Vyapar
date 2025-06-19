import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateBusinessData {
  name: string;
  gstNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(businessData: CreateBusinessData) {
    const business = await this.prisma.business.create({
      data: {
        name: businessData.name,
        gstNumber: businessData.gstNumber,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email,
      },
    });

    return business;
  }

  async findAll() {
    return this.prisma.business.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        },
        _count: {
          select: {
            customers: true,
            products: true,
            sales: true,
            purchases: true,
            expenses: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        },
        _count: {
          select: {
            customers: true,
            products: true,
            sales: true,
            purchases: true,
            expenses: true,
          }
        }
      }
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async findById(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        },
        _count: {
          select: {
            customers: true,
            products: true,
            sales: true,
            purchases: true,
            expenses: true,
          }
        }
      }
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async getBusinessSummary(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            products: true,
            sales: true,
            purchases: true,
            expenses: true,
          }
        }
      }
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Get financial data
    const [
      totalSales,
      totalPurchases,
      totalExpenses,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId: id },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { businessId: id },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId: id },
        _sum: { amount: true },
      }),
    ]);

    return {
      business,
      summary: {
        totalCustomers: business._count.customers,
        totalProducts: business._count.products,
        totalSales: totalSales._sum.amount || 0,
        totalPurchases: totalPurchases._sum.total || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
      }
    };
  }

  async update(id: string, updateData: Partial<CreateBusinessData>) {
    const business = await this.prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const updatedBusiness = await this.prisma.business.update({
      where: { id },
      data: updateData,
    });

    return updatedBusiness;
  }

  async remove(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    await this.prisma.business.delete({
      where: { id },
    });

    return {
      message: 'Business deleted successfully',
      deletedBusinessId: id,
    };
  }

  async getBusinessStats(id: string) {
    const [
      totalUsers,
      totalProducts,
      totalCustomers,
      totalSales,
      totalPurchases,
      salesSum,
      purchasesSum,
    ] = await Promise.all([
      this.prisma.user.count({ where: { businessId: id } }),
      this.prisma.product.count({ where: { businessId: id } }),
      this.prisma.customer.count({ where: { businessId: id } }),
      this.prisma.sale.count({ where: { businessId: id } }),
      this.prisma.purchase.count({ where: { businessId: id } }),
      this.prisma.sale.aggregate({
        where: { businessId: id },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { businessId: id },
        _sum: { total: true },
      }),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalCustomers,
      totalSales,
      totalPurchases,
      totalSalesAmount: salesSum._sum.amount || 0,
      totalPurchasesAmount: purchasesSum._sum.total || 0,
      netProfit: (salesSum._sum.amount || 0) - (purchasesSum._sum.total || 0),
    };
  }

  async delete(id: string) {
    return this.remove(id);
  }
}
