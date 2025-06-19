import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './purchases.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('purchase')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get(':businessId')
  async findAll(
    @Param('businessId') businessId: string,
    @Request() req: any
  ) {
    try {
      console.log('Getting purchases for business:', businessId);
      console.log('User from JWT:', req.user);
      
      const purchases = await this.purchasesService.findAll(businessId);
      return {
        success: true,
        data: purchases,
        message: 'Purchases fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching purchases:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch purchases'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/:id')
  async findOne(
    @Param('businessId') businessId: string, 
    @Param('id') id: string,
    @Request() req: any
  ) {
    try {
      console.log('Getting purchase:', id, 'for business:', businessId);
      
      const purchase = await this.purchasesService.findOne(businessId, id);
      return {
        success: true,
        data: purchase,
        message: 'Purchase fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching purchase:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Purchase not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':businessId')
  async create(
    @Param('businessId') businessId: string, 
    @Body() createPurchaseDto: CreatePurchaseDto,
    @Request() req: any
  ) {
    try {
      console.log('Creating purchase for business:', businessId);
      console.log('Purchase data received:', createPurchaseDto);
      console.log('User from JWT:', req.user);
      
      const purchase = await this.purchasesService.create(businessId, createPurchaseDto);
      return {
        success: true,
        data: purchase,
        message: 'Purchase created successfully'
      };
    } catch (error: any) {
      console.error('Error creating purchase:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create purchase'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:id')
  async update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updatePurchaseDto: UpdatePurchaseDto,
    @Request() req: any
  ) {
    try {
      console.log('Updating purchase:', id, 'for business:', businessId);
      console.log('Update data:', updatePurchaseDto);
      
      const purchase = await this.purchasesService.update(businessId, id, updatePurchaseDto);
      return {
        success: true,
        data: purchase,
        message: 'Purchase updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating purchase:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update purchase'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:id')
  async remove(
    @Param('businessId') businessId: string, 
    @Param('id') id: string,
    @Request() req: any
  ) {
    try {
      console.log('Deleting purchase:', id, 'for business:', businessId);
      
      await this.purchasesService.remove(businessId, id);
      return {
        success: true,
        message: 'Purchase deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting purchase:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete purchase'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/stats/total')
  async getTotalAmount(
    @Param('businessId') businessId: string,
    @Request() req: any
  ) {
    try {
      console.log('Getting total purchases amount for business:', businessId);
      
      const totalAmount = await this.purchasesService.getTotalAmount(businessId);
      return {
        success: true,
        data: { totalAmount },
        message: 'Total purchases amount fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching total amount:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch total amount'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/stats/monthly/:month/:year')
  async getMonthlyStats(
    @Param('businessId') businessId: string,
    @Param('month') month: string,
    @Param('year') year: string,
    @Request() req: any
  ) {
    try {
      console.log('Getting monthly stats for business:', businessId);
      
      const monthlyStats = await this.purchasesService.getMonthlyStats(
        businessId, 
        parseInt(month), 
        parseInt(year)
      );
      return {
        success: true,
        data: monthlyStats,
        message: 'Monthly statistics fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching monthly stats:', error.message);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch monthly statistics'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
