import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Request } from '@nestjs/common';
import { QuotationsService, Quotation } from './quotations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateQuotationDto, UpdateQuotationDto } from './dto/quotations.dto';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get(':businessId')
  async getQuotations(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: Quotation[]; message: string }> {
    try {
      console.log('Quotations: Getting quotations for business:', businessId);
      console.log('Quotations: User from JWT:', req.user?.email || 'Unknown');
      
      const quotations = await this.quotationsService.getQuotations(businessId);
      return {
        success: true,
        data: quotations,
        message: 'Quotations fetched successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error fetching quotations:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch quotations'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/:quotationId')
  async getQuotation(
    @Param('businessId') businessId: string,
    @Param('quotationId') quotationId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: Quotation; message: string }> {
    try {
      console.log('Quotations: Getting quotation:', quotationId, 'for business:', businessId);
      
      const quotation = await this.quotationsService.getQuotationById(businessId, quotationId);
      return {
        success: true,
        data: quotation,
        message: 'Quotation fetched successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error fetching quotation:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Quotation not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':businessId')
  async createQuotation(
    @Param('businessId') businessId: string,
    @Body() createDto: CreateQuotationDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: Quotation; message: string }> {
    try {
      console.log('Quotations: Creating quotation for business:', businessId);
      console.log('Quotations: Quotation data:', createDto);
      
      const quotation = await this.quotationsService.createQuotation(businessId, createDto);
      return {
        success: true,
        data: quotation,
        message: 'Quotation created successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error creating quotation:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create quotation'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:quotationId')
  async updateQuotation(
    @Param('businessId') businessId: string,
    @Param('quotationId') quotationId: string,
    @Body() updateDto: UpdateQuotationDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: Quotation; message: string }> {
    try {
      console.log('Quotations: Updating quotation:', quotationId, 'for business:', businessId);
      
      const quotation = await this.quotationsService.updateQuotation(businessId, quotationId, updateDto);
      return {
        success: true,
        data: quotation,
        message: 'Quotation updated successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error updating quotation:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update quotation'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:quotationId')
  async deleteQuotation(
    @Param('businessId') businessId: string,
    @Param('quotationId') quotationId: string,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Quotations: Deleting quotation:', quotationId, 'for business:', businessId);
      
      await this.quotationsService.deleteQuotation(businessId, quotationId);
      return {
        success: true,
        message: 'Quotation deleted successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error deleting quotation:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete quotation'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stats/:businessId')
  async getQuotationsStats(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Quotations: Getting stats for business:', businessId);
      
      const stats = await this.quotationsService.getQuotationsStats(businessId);
      return {
        success: true,
        data: stats,
        message: 'Quotations stats fetched successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error fetching stats:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch quotations stats'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':businessId/:quotationId/status')
  async updateQuotationStatus(
    @Param('businessId') businessId: string,
    @Param('quotationId') quotationId: string,
    @Body() statusData: { status: 'Sent' | 'Accepted' | 'Pending' | 'Rejected' },
    @Request() req: any
  ): Promise<{ success: boolean; data: Quotation; message: string }> {
    try {
      console.log('Quotations: Updating quotation status:', quotationId, 'to:', statusData.status);
      
      const quotation = await this.quotationsService.updateQuotationStatus(businessId, quotationId, statusData.status);
      return {
        success: true,
        data: quotation,
        message: 'Quotation status updated successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error updating quotation status:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update quotation status'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':businessId/:quotationId/convert-to-sales-order')
  async convertToSalesOrder(
    @Param('businessId') businessId: string,
    @Param('quotationId') quotationId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: { salesOrderId: string }; message: string }> {
    try {
      console.log('Quotations: Converting quotation to sales order:', quotationId);
      
      const result = await this.quotationsService.convertToSalesOrder(businessId, quotationId);
      return {
        success: true,
        data: { salesOrderId: result.salesOrderId },
        message: 'Quotation converted to sales order successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error converting to sales order:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to convert to sales order'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Debug endpoint to check business data
  @Get('debug/businesses')
  async getBusinessIds(
    @Request() req: any
  ): Promise<{ success: boolean; data: string[]; message: string }> {
    try {
      console.log('Quotations: Getting all business IDs for debug');
      
      const businessIds = await this.quotationsService.getAllBusinessIds();
      return {
        success: true,
        data: businessIds,
        message: 'Business IDs fetched successfully'
      };
    } catch (error: any) {
      console.error('Quotations: Error getting business IDs:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to get business IDs'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
