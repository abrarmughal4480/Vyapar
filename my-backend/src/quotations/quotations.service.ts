import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuotationDto, UpdateQuotationDto } from './dto/quotations.dto';

export interface QuotationItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  amount: number;
}

export interface Quotation {
  id: string;
  number: string;
  businessId: string;
  customer: string;
  validUntil?: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  status: 'Sent' | 'Accepted' | 'Pending' | 'Rejected';
  date: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class QuotationsService {
  private quotations: Map<string, Quotation[]> = new Map();
  private nextQuotationNumber = 1;

  constructor() {
    console.log('📋 Initializing Quotations service for real API...');
  }

  async getQuotations(businessId: string): Promise<Quotation[]> {
    console.log('Getting quotations for business:', businessId);
    
    const quotations = this.quotations.get(businessId) || [];
    console.log(`Found ${quotations.length} quotations for business: ${businessId}`);
    
    return quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getQuotationById(businessId: string, quotationId: string): Promise<Quotation> {
    console.log('Getting quotation:', quotationId, 'for business:', businessId);
    
    const quotations = this.quotations.get(businessId) || [];
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${quotationId} not found`);
    }
    
    return quotation;
  }

  async createQuotation(businessId: string, createDto: CreateQuotationDto): Promise<Quotation> {
    console.log('Creating quotation for business:', businessId, createDto);
    
    const quotationId = `QUO-${Date.now()}-${this.nextQuotationNumber++}`;
    const quotationNumber = `QUO-${String(this.nextQuotationNumber).padStart(3, '0')}`;
    
    // Calculate totals
    const items = createDto.items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: item.qty * item.price
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    const newQuotation: Quotation = {
      id: quotationId,
      number: quotationNumber,
      businessId,
      customer: createDto.customer,
      validUntil: createDto.validUntil,
      items,
      subtotal,
      tax,
      total,
      notes: createDto.notes,
      status: createDto.status || 'Sent',
      date: createDto.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store the quotation
    const businessQuotations = this.quotations.get(businessId) || [];
    businessQuotations.push(newQuotation);
    this.quotations.set(businessId, businessQuotations);
    
    console.log('Quotation created successfully:', quotationId);
    
    return newQuotation;
  }

  async updateQuotation(businessId: string, quotationId: string, updateDto: UpdateQuotationDto): Promise<Quotation> {
    console.log('Updating quotation:', quotationId, 'for business:', businessId);
    
    const businessQuotations = this.quotations.get(businessId) || [];
    const quotationIndex = businessQuotations.findIndex(q => q.id === quotationId);
    
    if (quotationIndex === -1) {
      throw new NotFoundException(`Quotation with ID ${quotationId} not found`);
    }

    const existingQuotation = businessQuotations[quotationIndex];
    
    // Update items if provided
    let items = existingQuotation.items;
    let subtotal = existingQuotation.subtotal;
    let tax = existingQuotation.tax;
    let total = existingQuotation.total;
    
    if (updateDto.items) {
      items = updateDto.items.map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: item.qty * item.price
      }));
      
      subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      tax = subtotal * 0.18;
      total = subtotal + tax;
    }

    const updatedQuotation: Quotation = {
      ...existingQuotation,
      ...updateDto,
      items,
      subtotal,
      tax,
      total,
      updatedAt: new Date().toISOString(),
    };

    businessQuotations[quotationIndex] = updatedQuotation;
    this.quotations.set(businessId, businessQuotations);
    
    console.log('Quotation updated successfully:', quotationId);
    
    return updatedQuotation;
  }

  async deleteQuotation(businessId: string, quotationId: string): Promise<void> {
    console.log('Deleting quotation:', quotationId, 'for business:', businessId);
    
    const businessQuotations = this.quotations.get(businessId) || [];
    const quotationIndex = businessQuotations.findIndex(q => q.id === quotationId);
    
    if (quotationIndex === -1) {
      throw new NotFoundException(`Quotation with ID ${quotationId} not found`);
    }

    businessQuotations.splice(quotationIndex, 1);
    this.quotations.set(businessId, businessQuotations);
    
    console.log('Quotation deleted successfully:', quotationId);
  }

  async getQuotationsStats(businessId: string): Promise<any> {
    console.log('Getting quotations stats for business:', businessId);
    
    const quotations = this.quotations.get(businessId) || [];
    
    const totalQuotations = quotations.length;
    const acceptedQuotations = quotations.filter(q => q.status === 'Accepted').length;
    const pendingQuotations = quotations.filter(q => q.status === 'Pending').length;
    const sentQuotations = quotations.filter(q => q.status === 'Sent').length;
    const rejectedQuotations = quotations.filter(q => q.status === 'Rejected').length;
    const totalValue = quotations.reduce((sum, q) => sum + q.total, 0);
    
    const stats = {
      totalQuotations,
      acceptedQuotations,
      pendingQuotations,
      sentQuotations,
      rejectedQuotations,
      totalValue,
      recentQuotations: quotations.slice(0, 5) // Last 5 quotations
    };
    
    console.log('Quotations stats calculated:', stats);
    
    return stats;
  }

  async updateQuotationStatus(businessId: string, quotationId: string, status: 'Sent' | 'Accepted' | 'Pending' | 'Rejected'): Promise<Quotation> {
    console.log('Updating quotation status:', quotationId, 'to:', status);
    
    return this.updateQuotation(businessId, quotationId, { status });
  }

  async convertToSalesOrder(businessId: string, quotationId: string): Promise<{ success: boolean; salesOrderId: string }> {
    console.log('Converting quotation to sales order:', quotationId);
    
    const quotation = await this.getQuotationById(businessId, quotationId);
    
    // Update quotation status to accepted
    await this.updateQuotationStatus(businessId, quotationId, 'Accepted');
    
    // Generate sales order ID
    const salesOrderId = `SO-${Date.now()}`;
    
    console.log('Quotation converted to sales order:', salesOrderId);
    
    return {
      success: true,
      salesOrderId
    };
  }

  // Get all business IDs (for admin/debug purposes)
  async getAllBusinessIds(): Promise<string[]> {
    const allBusinessIds = Array.from(this.quotations.keys());
    console.log('All business IDs with quotations:', allBusinessIds);
    return allBusinessIds;
  }

  // Clear data for a specific business (for testing)
  async clearBusinessData(businessId: string): Promise<void> {
    console.log('Clearing quotations data for business:', businessId);
    this.quotations.delete(businessId);
  }
}
