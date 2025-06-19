import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SaleInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  invoiceAmount: number;
  received: number;
  balance: number;
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    amount: number;
    unit?: string;
  }>;
  paymentMode: string;
  notes?: string;
  status: 'Draft' | 'Paid' | 'Partial' | 'Overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSaleInvoiceDto {
  partyName: string;
  phoneNo?: string;
  invoiceDate?: string;
  items: Array<{
    item: string;
    qty: number;
    unit?: string;
    price: number;
    amount: number;
  }>;
  discount?: string;
  discountType?: string;
  tax?: string;
  paymentType: string;
  description?: string;
  imageUrl?: string; // Add image URL field
}

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(businessId: string, createDto: CreateSaleInvoiceDto): Promise<any> {
    try {
      console.log('Creating invoice for business:', businessId);
      console.log('Invoice data:', createDto);

      // Validation
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }

      if (!createDto.partyName?.trim()) {
        throw new BadRequestException('Party name is required');
      }

      if (!createDto.items || createDto.items.length === 0) {
        throw new BadRequestException('At least one item is required');
      }

      // Filter out empty items
      const validItems = createDto.items.filter(item => 
        item.item && item.item.trim() && item.qty > 0 && item.price >= 0
      );

      if (validItems.length === 0) {
        throw new BadRequestException('At least one valid item is required');
      }

      // Calculate total amount from items
      const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
      
      if (totalAmount <= 0) {
        throw new BadRequestException('Invoice amount must be greater than 0');
      }

      // Validate items
      for (const item of validItems) {
        if (!item.item?.trim()) {
          throw new BadRequestException('Item name is required');
        }
        if (item.qty <= 0) {
          throw new BadRequestException('Item quantity must be greater than 0');
        }
        if (item.price < 0) {
          throw new BadRequestException('Item price cannot be negative');
        }
      }

      // Apply discount if any
      let finalAmount = totalAmount;
      if (createDto.discount && parseFloat(createDto.discount) > 0) {
        const discountValue = parseFloat(createDto.discount);
        if (createDto.discountType === '%') {
          finalAmount = totalAmount - (totalAmount * discountValue / 100);
        } else {
          finalAmount = totalAmount - discountValue;
        }
      }

      // Determine received amount based on payment type
      const received = createDto.paymentType === 'Cash' ? finalAmount : 0;
      const balance = finalAmount - received;

      // Get next invoice number for this business
      const existingSales = await this.prisma.sale.findMany({
        where: {
          businessId: businessId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const nextInvoiceNumber = (existingSales.length + 1).toString();

      // Create sale record in database
      const sale = await this.prisma.sale.create({
        data: {
          customer: createDto.partyName.trim(),
          amount: finalAmount,
          items: JSON.stringify({
            invoiceNumber: nextInvoiceNumber,
            items: validItems.map(item => ({
              name: item.item.trim(),
              qty: item.qty,
              unit: item.unit || 'NONE',
              price: item.price,
              amount: item.amount
            })),
            discount: createDto.discount || '0',
            discountType: createDto.discountType || '%',
            tax: createDto.tax || 'NONE',
            paymentType: createDto.paymentType,
            phoneNo: createDto.phoneNo || '',
            description: createDto.description || '',
            imageUrl: createDto.imageUrl || null // Add image URL to stored data
          }),
          date: createDto.invoiceDate || new Date().toISOString().split('T')[0],
          businessId: businessId
        }
      });

      console.log('Sale created successfully:', sale.id);
      
      return {
        id: sale.id,
        invoiceNumber: nextInvoiceNumber,
        customerName: sale.customer,
        amount: sale.amount,
        received: received,
        balance: balance,
        paymentType: createDto.paymentType,
        items: validItems,
        date: sale.date,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt
      };
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  async getInvoices(businessId: string): Promise<any[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }

      const sales = await this.prisma.sale.findMany({
        where: {
          businessId: businessId
        },
        orderBy: {
          createdAt: 'asc'  // Changed to ascending order to get oldest first
        }
      });

      return sales.map((sale, index) => {
        const itemsData = JSON.parse(sale.items);
        const received = itemsData.paymentType === 'Cash' ? sale.amount : 0;
        const balance = sale.amount - received;
        
        // Invoice number starts from 1 and increments
        const invoiceNumber = (index + 1).toString();
        
        return {
          id: sale.id,
          date: new Date(sale.date).toLocaleDateString('en-GB'),
          invoiceNo: invoiceNumber,
          partyName: sale.customer,
          transaction: 'Sale',
          paymentType: itemsData.paymentType || 'Credit',
          amount: sale.amount,
          balance: balance,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt
        };
      }).reverse(); // Reverse to show latest first in UI but maintain correct numbering
    } catch (error) {
      throw error;
    }
  }

  async getTotalSales(businessId: string): Promise<{ totalAmount: number; totalReceived: number; totalBalance: number }> {
    try {
      const sales = await this.prisma.sale.findMany({
        where: {
          businessId: businessId
        }
      });

      let totalAmount = 0;
      let totalReceived = 0;
      let totalBalance = 0;

      sales.forEach(sale => {
        const itemsData = JSON.parse(sale.items);
        const received = itemsData.paymentType === 'Cash' ? sale.amount : 0;
        const balance = sale.amount - received;
        
        totalAmount += sale.amount;
        totalReceived += received;
        totalBalance += balance;
      });

      return {
        totalAmount,
        totalReceived,
        totalBalance
      };
    } catch (error) {
      throw error;
    }
  }

  async getInvoiceById(businessId: string, invoiceId: string): Promise<any> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }

      if (!invoiceId) {
        throw new BadRequestException('Invoice ID is required');
      }

      const sale = await this.prisma.sale.findFirst({
        where: {
          id: invoiceId,
          businessId: businessId
        }
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${invoiceId} not found`);
      }

      // Get all sales to calculate invoice number
      const allSales = await this.prisma.sale.findMany({
        where: {
          businessId: businessId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const saleIndex = allSales.findIndex(s => s.id === sale.id);
      const invoiceNumber = (saleIndex + 1).toString();

      const itemsData = JSON.parse(sale.items);
      const received = itemsData.paymentType === 'Cash' ? sale.amount : 0;
      const balance = sale.amount - received;

      return {
        id: sale.id,
        invoiceNumber: invoiceNumber,
        customerName: sale.customer,
        amount: sale.amount,
        received: received,
        balance: balance,
        items: itemsData.items,
        phoneNo: itemsData.phoneNo || '',
        discount: itemsData.discount || '',
        discountType: itemsData.discountType || '%',
        tax: itemsData.tax || 'NONE',
        paymentType: itemsData.paymentType || 'Credit',
        description: itemsData.description || '',
        imageUrl: itemsData.imageUrl || null, // Add image URL to response
        date: sale.date,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  async updateInvoice(businessId: string, invoiceId: string, updateData: Partial<CreateSaleInvoiceDto>): Promise<any> {
    try {
      const existingSale = await this.prisma.sale.findFirst({
        where: {
          id: invoiceId,
          businessId: businessId
        }
      });

      if (!existingSale) {
        throw new NotFoundException(`Sale with ID ${invoiceId} not found`);
      }

      const existingItemsData = JSON.parse(existingSale.items);
      
      // Calculate new amount if items are updated
      let newAmount = existingSale.amount;
      if (updateData.items) {
        const validItems = updateData.items.filter(item => 
          item.item && item.item.trim() && item.qty > 0 && item.price >= 0
        );
        newAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
        
        // Apply discount if any
        if (updateData.discount && parseFloat(updateData.discount) > 0) {
          const discountValue = parseFloat(updateData.discount);
          if (updateData.discountType === '%') {
            newAmount = newAmount - (newAmount * discountValue / 100);
          } else {
            newAmount = newAmount - discountValue;
          }
        }
      }

      const updatedItemsData = {
        ...existingItemsData,
        items: updateData.items || existingItemsData.items,
        discount: updateData.discount || existingItemsData.discount,
        discountType: updateData.discountType || existingItemsData.discountType,
        tax: updateData.tax || existingItemsData.tax,
        paymentType: updateData.paymentType || existingItemsData.paymentType,
        phoneNo: updateData.phoneNo || existingItemsData.phoneNo,
        description: updateData.description || existingItemsData.description,
        imageUrl: updateData.imageUrl !== undefined ? updateData.imageUrl : existingItemsData.imageUrl // Handle image URL update
      };

      const updatedSale = await this.prisma.sale.update({
        where: {
          id: invoiceId
        },
        data: {
          customer: updateData.partyName || existingSale.customer,
          amount: newAmount,
          items: JSON.stringify(updatedItemsData),
          date: updateData.invoiceDate || existingSale.date
        }
      });

      const received = updatedItemsData.paymentType === 'Cash' ? updatedSale.amount : 0;
      const balance = updatedSale.amount - received;

      return {
        id: updatedSale.id,
        invoiceNumber: updatedSale.id,
        customerName: updatedSale.customer,
        amount: updatedSale.amount,
        received: received,
        balance: balance,
        items: updatedItemsData.items,
        date: updatedSale.date,
        createdAt: updatedSale.createdAt,
        updatedAt: updatedSale.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteInvoice(businessId: string, invoiceId: string): Promise<void> {
    try {
      const sale = await this.prisma.sale.findFirst({
        where: {
          id: invoiceId,
          businessId: businessId
        }
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${invoiceId} not found`);
      }

      await this.prisma.sale.delete({
        where: {
          id: invoiceId
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getCustomers(businessId: string): Promise<any[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }

      const sales = await this.prisma.sale.findMany({
        where: {
          businessId: businessId
        },
        select: {
          customer: true,
          items: true
        }
      });

      // Extract unique customers with their phone numbers
      const customerMap = new Map();
      
      sales.forEach(sale => {
        const itemsData = JSON.parse(sale.items);
        const phoneNo = itemsData.phoneNo || '';
        
        if (!customerMap.has(sale.customer)) {
          customerMap.set(sale.customer, {
            name: sale.customer,
            phone: phoneNo
          });
        }
      });

      return Array.from(customerMap.values());
    } catch (error) {
      throw error;
    }
  }
}
