import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './purchases.dto';

export interface Purchase {
  id: string;
  businessId: string;
  supplier: string;
  amount: number;
  items: string;
  date: string;
  invoiceNumber?: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMode?: string;
  notes?: string;
  type: 'Purchase Bill' | 'Cash Purchase' | 'Purchase Return' | 'Purchase Order';
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { businessId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return purchases.map(purchase => ({
      id: purchase.id,
      businessId: purchase.businessId,
      supplier: purchase.supplier,
      amount: purchase.total,
      items: purchase.items.length.toString(),
      date: purchase.date.toISOString().split('T')[0],
      invoiceNumber: purchase.purchaseNo,
      status: purchase.status as 'pending' | 'completed' | 'cancelled',
      paymentMode: purchase.notes || '',
      notes: purchase.notes || '',
      type: 'Purchase Bill',
      dueDate: purchase.date.toISOString().split('T')[0],
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    }));
  }

  async findOne(businessId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        id: id,
        businessId,
      },
      include: {
        items: true,
      },
    });
    
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }
    
    return {
      id: purchase.id,
      businessId: purchase.businessId,
      supplier: purchase.supplier,
      amount: purchase.total,
      items: purchase.items.length.toString(),
      date: purchase.date.toISOString().split('T')[0],
      invoiceNumber: purchase.purchaseNo,
      status: purchase.status as 'pending' | 'completed' | 'cancelled',
      paymentMode: purchase.notes || '',
      notes: purchase.notes || '',
      type: 'Purchase Bill',
      dueDate: purchase.date.toISOString().split('T')[0],
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  async create(businessId: string, createPurchaseDto: CreatePurchaseDto): Promise<Purchase> {
    console.log('Service creating purchase with data:', createPurchaseDto);
    
    const purchase = await this.prisma.purchase.create({
      data: {
        businessId,
        purchaseNo: createPurchaseDto.invoiceNumber || `PUR-${Date.now()}`,
        date: new Date(createPurchaseDto.date),
        supplier: createPurchaseDto.supplier,
        subtotal: createPurchaseDto.amount,
        tax: 0,
        discount: 0,
        total: createPurchaseDto.amount,
        status: createPurchaseDto.paymentMode === 'cash' ? 'Draft' : 'Draft',
        notes: createPurchaseDto.notes || '',
        items: {
          create: [
            {
              productId: 'default-product-id', // You'll need to handle this properly
              quantity: parseInt(createPurchaseDto.items) || 1,
              rate: createPurchaseDto.amount / (parseInt(createPurchaseDto.items) || 1),
              amount: createPurchaseDto.amount,
            }
          ]
        }
      },
      include: {
        items: true,
      },
    });

    console.log('Purchase created successfully:', purchase);

    return {
      id: purchase.id,
      businessId: purchase.businessId,
      supplier: purchase.supplier,
      amount: purchase.total,
      items: purchase.items.length.toString(),
      date: purchase.date.toISOString().split('T')[0],
      invoiceNumber: purchase.purchaseNo,
      status: 'completed',
      paymentMode: createPurchaseDto.paymentMode || '',
      notes: purchase.notes || '',
      type: 'Purchase Bill',
      dueDate: createPurchaseDto.dueDate || purchase.date.toISOString().split('T')[0],
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  async update(businessId: string, id: string, updatePurchaseDto: UpdatePurchaseDto) {
    // First check if purchase exists and belongs to business
    const existingPurchase = await this.prisma.purchase.findFirst({
      where: {
        id: id,
        businessId: businessId,
      },
    });

    if (!existingPurchase) {
      throw new NotFoundException('Purchase not found');
    }

    const updateData: any = {
      supplier: updatePurchaseDto.supplier || existingPurchase.supplier,
      total: updatePurchaseDto.amount || existingPurchase.total,
      subtotal: updatePurchaseDto.amount || existingPurchase.subtotal,
      date: updatePurchaseDto.date ? new Date(updatePurchaseDto.date) : existingPurchase.date,
      purchaseNo: updatePurchaseDto.invoiceNumber || existingPurchase.purchaseNo,
      status: updatePurchaseDto.status || existingPurchase.status,
      notes: updatePurchaseDto.notes || existingPurchase.notes,
    };

    const purchase = await this.prisma.purchase.update({
      where: {
        id: id,
      },
      data: updateData,
      include: {
        items: true,
      },
    });

    return {
      id: purchase.id,
      businessId: purchase.businessId,
      supplier: purchase.supplier,
      amount: purchase.total,
      items: purchase.items.length.toString(),
      date: purchase.date.toISOString().split('T')[0],
      invoiceNumber: purchase.purchaseNo,
      status: purchase.status as 'pending' | 'completed' | 'cancelled',
      paymentMode: updatePurchaseDto.paymentMode || '',
      notes: purchase.notes || '',
      type: 'Purchase Bill',
      dueDate: updatePurchaseDto.dueDate || purchase.date.toISOString().split('T')[0],
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  async remove(businessId: string, id: string) {
    // First check if purchase exists and belongs to business
    const existingPurchase = await this.prisma.purchase.findFirst({
      where: {
        id: id,
        businessId: businessId,
      },
    });

    if (!existingPurchase) {
      throw new NotFoundException('Purchase not found');
    }

    // Delete purchase items first, then purchase
    await this.prisma.purchaseItem.deleteMany({
      where: {
        purchaseId: id,
      },
    });

    await this.prisma.purchase.delete({
      where: {
        id: id,
      },
    });
  }

  async getTotalAmount(businessId: string): Promise<number> {
    const result = await this.prisma.purchase.aggregate({
      where: {
        businessId: businessId,
        status: 'Draft', // Completed purchases
      },
      _sum: {
        total: true,
      },
    });

    return result._sum.total || 0;
  }

  async getMonthlyStats(businessId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const purchases = await this.prisma.purchase.findMany({
      where: {
        businessId: businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'Draft',
      },
    });

    return {
      count: purchases.length,
      totalAmount: purchases.reduce((total, purchase) => total + purchase.total, 0),
      purchases: purchases,
    };
  }
}
