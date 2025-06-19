import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceDto: CreateInvoiceDto) {
    return this.prisma.quotation.create({
      data: {
        quotationNo: createInvoiceDto.invoiceNo || `QUO-${Date.now()}`,
        date: createInvoiceDto.date || new Date(),
        validUntil: createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : undefined,
        customerId: createInvoiceDto.customerId,
        businessId: createInvoiceDto.businessId,
        subtotal: createInvoiceDto.subtotal,
        tax: createInvoiceDto.tax || 0,
        discount: createInvoiceDto.discount || 0,
        total: createInvoiceDto.total,
        status: createInvoiceDto.status || 'Draft',
        notes: createInvoiceDto.notes,
        items: {
          create: createInvoiceDto.items?.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })) || [],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });
  }

  async findAll(businessId: string) {
    return this.prisma.quotation.findMany({
      where: { businessId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const updateData: any = {};
    if (updateInvoiceDto.status) updateData.status = updateInvoiceDto.status;
    if (updateInvoiceDto.notes) updateData.notes = updateInvoiceDto.notes;
    if (updateInvoiceDto.subtotal) updateData.subtotal = updateInvoiceDto.subtotal;
    if (updateInvoiceDto.tax !== undefined) updateData.tax = updateInvoiceDto.tax;
    if (updateInvoiceDto.discount !== undefined) updateData.discount = updateInvoiceDto.discount;
    if (updateInvoiceDto.total) updateData.total = updateInvoiceDto.total;

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return this.prisma.quotation.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
  }
}
