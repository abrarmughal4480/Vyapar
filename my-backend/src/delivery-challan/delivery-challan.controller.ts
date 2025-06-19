import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Query } from '@nestjs/common';
import { DeliveryChallanService, DeliveryChallan } from './delivery-challan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  CreateDeliveryChallanDto, 
  UpdateDeliveryChallanDto, 
  FilterDeliveryChallanDto 
} from './dto/delivery-challan.dto';

@Controller('delivery-challan')
@UseGuards(JwtAuthGuard)
export class DeliveryChallanController {
  constructor(private readonly deliveryChallanService: DeliveryChallanService) {}

  @Get(':businessId')
  async getChallans(
    @Param('businessId') businessId: string,
    @Query() filters: FilterDeliveryChallanDto
  ): Promise<{ success: boolean; data: DeliveryChallan[]; message: string }> {
    try {
      console.log('Getting delivery challans for business:', businessId);
      const challans = await this.deliveryChallanService.getChallans(businessId, filters);
      return {
        success: true,
        data: challans,
        message: 'Delivery challans fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery challans:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch delivery challans'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/:challanId')
  async getChallan(
    @Param('businessId') businessId: string,
    @Param('challanId') challanId: string
  ): Promise<{ success: boolean; data: DeliveryChallan; message: string }> {
    try {
      const challan = await this.deliveryChallanService.getChallanById(businessId, challanId);
      return {
        success: true,
        data: challan,
        message: 'Delivery challan fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Delivery challan not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':businessId')
  async createChallan(
    @Param('businessId') businessId: string,
    @Body() createChallanDto: CreateDeliveryChallanDto
  ): Promise<{ success: boolean; data: DeliveryChallan; message: string }> {
    try {
      const challan = await this.deliveryChallanService.createChallan(businessId, createChallanDto);
      return {
        success: true,
        data: challan,
        message: 'Delivery challan created successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create delivery challan'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:challanId')
  async updateChallan(
    @Param('businessId') businessId: string,
    @Param('challanId') challanId: string,
    @Body() updateChallanDto: UpdateDeliveryChallanDto
  ): Promise<{ success: boolean; data: DeliveryChallan; message: string }> {
    try {
      const challan = await this.deliveryChallanService.updateChallan(businessId, challanId, updateChallanDto);
      return {
        success: true,
        data: challan,
        message: 'Delivery challan updated successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update delivery challan'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:challanId')
  async deleteChallan(
    @Param('businessId') businessId: string,
    @Param('challanId') challanId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.deliveryChallanService.deleteChallan(businessId, challanId);
      return {
        success: true,
        message: 'Delivery challan deleted successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete delivery challan'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/summary')
  async getSummary(@Param('businessId') businessId: string) {
    try {
      const summary = await this.deliveryChallanService.getSummary(businessId);
      return {
        success: true,
        data: summary,
        message: 'Summary fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch summary'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
