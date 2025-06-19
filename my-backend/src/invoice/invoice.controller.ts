import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':businessId')
  async findAll(@Param('businessId') businessId: string) {
    try {
      const invoices = await this.invoiceService.findAll(businessId);
      return {
        success: true,
        data: invoices,
        message: 'Invoices fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch invoices'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/:id')
  async findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    try {
      const invoice = await this.invoiceService.findOne(businessId, id);
      return {
        success: true,
        data: invoice,
        message: 'Invoice fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Invoice not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':businessId')
  async create(@Param('businessId') businessId: string, @Body() createInvoiceDto: CreateInvoiceDto) {
    try {
      const invoice = await this.invoiceService.create(businessId, createInvoiceDto);
      return {
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:id')
  async update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto
  ) {
    try {
      const invoice = await this.invoiceService.update(businessId, id, updateInvoiceDto);
      return {
        success: true,
        data: invoice,
        message: 'Invoice updated successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:id')
  async remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    try {
      await this.invoiceService.remove(businessId, id);
      return {
        success: true,
        message: 'Invoice deleted successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete invoice'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/stats/total')
  async getTotalAmount(@Param('businessId') businessId: string) {
    try {
      const totalAmount = await this.invoiceService.getTotalAmount(businessId);
      return {
        success: true,
        data: { totalAmount },
        message: 'Total invoice amount fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch total amount'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
