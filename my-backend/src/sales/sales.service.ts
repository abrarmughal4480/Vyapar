import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales.dto';

export interface SalesOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface SalesOrder {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: SalesOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Created' | 'Completed' | 'Cancelled';
  date: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SalesService {
  private salesOrders: Map<string, SalesOrder[]> = new Map();
  private nextOrderId = 1;

  constructor(private prisma: PrismaService) {
    console.log('📊 Initializing Sales service for real API...');
  }

  async getSalesOrders(businessId: string): Promise<SalesOrder[]> {
    console.log('Getting sales orders for business:', businessId);
    
    const orders = this.salesOrders.get(businessId) || [];
    console.log(`Found ${orders.length} sales orders for business: ${businessId}`);
    
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSalesOrderById(businessId: string, orderId: string): Promise<SalesOrder> {
    console.log('Getting sales order:', orderId, 'for business:', businessId);
    
    const orders = this.salesOrders.get(businessId) || [];
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      throw new NotFoundException(`Sales order with ID ${orderId} not found`);
    }
    
    return order;
  }

  async createSalesOrder(businessId: string, createDto: CreateSalesOrderDto): Promise<SalesOrder> {
    console.log('Creating sales order for business:', businessId, createDto);
    
    const orderId = `SO-${Date.now()}-${this.nextOrderId++}`;
    
    // Calculate totals
    const items = createDto.items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: item.quantity * item.price
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    const newOrder: SalesOrder = {
      id: orderId,
      businessId,
      customerName: createDto.customerName,
      customerPhone: createDto.customerPhone,
      customerAddress: createDto.customerAddress,
      items,
      subtotal,
      tax,
      total,
      status: createDto.status || 'Draft',
      date: createDto.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store the order
    const businessOrders = this.salesOrders.get(businessId) || [];
    businessOrders.push(newOrder);
    this.salesOrders.set(businessId, businessOrders);
    
    console.log('Sales order created successfully:', orderId);
    
    return newOrder;
  }

  async updateSalesOrder(businessId: string, orderId: string, updateDto: UpdateSalesOrderDto): Promise<SalesOrder> {
    console.log('Updating sales order:', orderId, 'for business:', businessId);
    
    const businessOrders = this.salesOrders.get(businessId) || [];
    const orderIndex = businessOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      throw new NotFoundException(`Sales order with ID ${orderId} not found`);
    }

    const existingOrder = businessOrders[orderIndex];
    
    // Update items if provided
    let items = existingOrder.items;
    let subtotal = existingOrder.subtotal;
    let tax = existingOrder.tax;
    let total = existingOrder.total;
    
    if (updateDto.items) {
      items = updateDto.items.map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: item.quantity * item.price
      }));
      
      subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      tax = subtotal * 0.18;
      total = subtotal + tax;
    }

    const updatedOrder: SalesOrder = {
      ...existingOrder,
      ...updateDto,
      items,
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString(),
    };

    businessOrders[orderIndex] = updatedOrder;
    this.salesOrders.set(businessId, businessOrders);
    
    console.log('Sales order updated successfully:', orderId);
    
    return updatedOrder;
  }

  async deleteSalesOrder(businessId: string, orderId: string): Promise<void> {
    console.log('Deleting sales order:', orderId, 'for business:', businessId);
    
    const businessOrders = this.salesOrders.get(businessId) || [];
    const orderIndex = businessOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      throw new NotFoundException(`Sales order with ID ${orderId} not found`);
    }

    businessOrders.splice(orderIndex, 1);
    this.salesOrders.set(businessId, businessOrders);
    
    console.log('Sales order deleted successfully:', orderId);
  }

  async getSalesStats(businessId: string): Promise<any> {
    console.log('Getting sales stats for business:', businessId);
    
    const orders = this.salesOrders.get(businessId) || [];
    
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'Completed').length;
    const draftOrders = orders.filter(o => o.status === 'Draft').length;
    const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
    
    const stats = {
      totalOrders,
      completedOrders,
      draftOrders,
      totalValue,
      recentOrders: orders.slice(0, 5) // Last 5 orders
    };
    
    console.log('Sales stats calculated:', stats);
    
    return stats;
  }

  async updateOrderStatus(businessId: string, orderId: string, status: 'Draft' | 'Created' | 'Completed' | 'Cancelled'): Promise<SalesOrder> {
    console.log('Updating order status:', orderId, 'to:', status);
    
    return this.updateSalesOrder(businessId, orderId, { status });
  }

  async convertToInvoice(businessId: string, orderId: string): Promise<{ success: boolean; invoiceId: string }> {
    console.log('Converting sales order to invoice:', orderId);
    
    const order = await this.getSalesOrderById(businessId, orderId);
    
    // Update order status to completed
    await this.updateOrderStatus(businessId, orderId, 'Completed');
    
    // Generate invoice ID
    const invoiceId = `INV-${Date.now()}`;
    
    console.log('Sales order converted to invoice:', invoiceId);
    
    return {
      success: true,
      invoiceId
    };
  }

  // Get all business IDs (for admin/debug purposes)
  async getAllBusinessIds(): Promise<string[]> {
    const allBusinessIds = Array.from(this.salesOrders.keys());
    console.log('All business IDs with sales orders:', allBusinessIds);
    return allBusinessIds;
  }

  // Clear data for a specific business (for testing)
  async clearBusinessData(businessId: string): Promise<void> {
    console.log('Clearing sales data for business:', businessId);
    this.salesOrders.delete(businessId);
  }

  // Dashboard stats based on in-memory data
  async getDashboardStats(businessId: string): Promise<any> {
    console.log('Getting dashboard stats for business:', businessId);
    
    const orders = this.salesOrders.get(businessId) || [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Filter orders for this month
    const thisMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const allTimeSales = orders.reduce((total, order) => total + order.total, 0);
    const thisMonthSales = thisMonthOrders.reduce((total, order) => total + order.total, 0);
    
    return {
      totalSales: thisMonthSales,
      salesCount: thisMonthOrders.length,
      allTimeSales: allTimeSales,
      allTimeSalesCount: orders.length
    };
  }
}