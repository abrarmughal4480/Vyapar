import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: createTransactionDto,
    });
  }

  async findAll(businessId?: string) {
    const where = businessId ? { businessId } : {};
    return this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactionSummary(businessId: string) {
    const [
      totalIn,
      totalOut,
      transactionCount,
    ] = await Promise.all([
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
      this.prisma.transaction.count({
        where: { businessId },
      }),
    ]);

    return {
      totalIn: totalIn._sum.amount || 0,
      totalOut: totalOut._sum.amount || 0,
      netAmount: (totalIn._sum.amount || 0) - (totalOut._sum.amount || 0),
      transactionCount,
    };
  }

  async findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        business: true,
      },
    });
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
    });
  }

  async remove(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getCashFlow(businessId: string) {
    const [totalIn, totalOut] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          businessId,
          type: 'Payment In',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          businessId,
          type: 'Payment Out',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const recentTransactions = await this.prisma.transaction.findMany({
      where: { businessId },
      include: {
        business: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalIn: totalIn._sum?.amount || 0,
      totalOut: totalOut._sum?.amount || 0,
      netCashFlow: (totalIn._sum?.amount || 0) - (totalOut._sum?.amount || 0),
      recentTransactions,
    };
  }
}
