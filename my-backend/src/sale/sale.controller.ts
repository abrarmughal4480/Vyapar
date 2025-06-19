import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpException, Request } from '@nestjs/common';
import { SaleService, CreateSaleInvoiceDto } from './sale.service';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post(':businessId/invoice')
  async createInvoice(
    @Param('businessId') businessId: string,
    @Body() createDto: CreateSaleInvoiceDto,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Creating invoice for business:', businessId);
      console.log('Sale: User from JWT:', req.user?.email || 'Unknown');
      console.log('Sale: Invoice data:', createDto);
      
      const invoice = await this.saleService.createInvoice(businessId, createDto);
      return {
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error creating invoice:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId')
  async getInvoices(
    @Param('businessId') businessId: string,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Getting invoices for business:', businessId);
      
      const invoices = await this.saleService.getInvoices(businessId);
      return {
        success: true,
        data: invoices,
        message: 'Invoices fetched successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error fetching invoices:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch invoices'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/invoice/:invoiceId')
  async getInvoice(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Getting invoice:', invoiceId, 'for business:', businessId);
      
      const invoice = await this.saleService.getInvoiceById(businessId, invoiceId);
      return {
        success: true,
        data: invoice,
        message: 'Invoice fetched successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error fetching invoice:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Invoice not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Put(':businessId/invoice/:invoiceId')
  async updateInvoice(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() updateDto: Partial<CreateSaleInvoiceDto>,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Updating invoice:', invoiceId, 'for business:', businessId);
      
      const invoice = await this.saleService.updateInvoice(businessId, invoiceId, updateDto);
      return {
        success: true,
        data: invoice,
        message: 'Invoice updated successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error updating invoice:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/invoice/:invoiceId')
  async deleteInvoice(
    @Param('businessId') businessId: string,
    @Param('invoiceId') invoiceId: string,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Deleting invoice:', invoiceId, 'for business:', businessId);
      
      await this.saleService.deleteInvoice(businessId, invoiceId);
      return {
        success: true,
        message: 'Invoice deleted successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error deleting invoice:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/stats')
  async getStats(
    @Param('businessId') businessId: string,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Getting stats for business:', businessId);
      
      const stats = await this.saleService.getTotalSales(businessId);
      return {
        success: true,
        data: stats,
        message: 'Stats fetched successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error fetching stats:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch stats'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/customers')
  async getCustomers(
    @Param('businessId') businessId: string,
    @Request() req: any
  ) {
    try {
      console.log('Sale: Getting customers for business:', businessId);
      
      const customers = await this.saleService.getCustomers(businessId);
      return {
        success: true,
        data: customers,
        message: 'Customers fetched successfully'
      };
    } catch (error: any) {
      console.error('Sale: Error fetching customers:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch customers'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Health check endpoint
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Sale service is running',
      timestamp: new Date().toISOString()
    };
  }
}
