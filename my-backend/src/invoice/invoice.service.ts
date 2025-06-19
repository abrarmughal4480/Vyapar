import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    return this.prisma.invoice.findMany({
      where: { businessId },
      include: { items: true },
    });
  }

  async findOne(businessId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(businessId: string, dto: CreateInvoiceDto) {
    const { items, ...invoiceData } = dto;

    return this.prisma.invoice.create({
      data: {
        ...invoiceData,
        businessId,
        items: {
          create: items,
        },
      },
      include: { items: true },
    });
  }

  async update(businessId: string, id: string, dto: UpdateInvoiceDto) {
    await this.prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        items: {
          create: dto.items,
        },
      },
      include: { items: true },
    });
  }

  async remove(businessId: string, id: string) {
    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  async getTotalAmount(businessId: string) {
    const result = await this.prisma.invoice.aggregate({
      where: { businessId },
      _sum: {
        invoiceAmount: true,
      },
    });

    return result._sum.invoiceAmount || 0;
  }

  async getNextInvoiceNumber(businessId: string) {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber) : 0;
    const nextNumber = (lastNumber + 1).toString().padStart(2, '0');

    return {
      success: true,
      nextNumber,
    };
  }
}
