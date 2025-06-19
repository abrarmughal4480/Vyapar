import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  HttpStatus, 
  HttpException, 
  Request,
  Query 
} from '@nestjs/common';
import { SalesService, SalesOrder } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales.dto';

interface AuthenticatedRequest {
  user?: {
    id: string;
    email: string;
    businessId?: string;
  };
}

type OrderStatus = 'Draft' | 'Created' | 'Completed' | 'Cancelled';

interface UpdateStatusDto {
  status: OrderStatus;
}

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('orders/:businessId')
  async getSalesOrders(
    @Param('businessId') businessId: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: SalesOrder[]; message: string }> {
    try {
      console.log('Sales: Getting orders for business:', businessId);
      console.log('Sales: User from JWT:', req?.user?.email || 'Unknown');
      console.log('Sales: Filters - status:', status, 'page:', page, 'limit:', limit);
      
      // Call service with only businessId as it expects 1 argument
      const result = await this.salesService.getSalesOrders(businessId);
      
      return {
        success: true,
        data: Array.isArray(result) ? result : [],
        message: 'Sales orders fetched successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error fetching orders:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch sales orders'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('orders/:businessId/:orderId')
  async getSalesOrder(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: SalesOrder; message: string }> {
    try {
      console.log('Sales: Getting order:', orderId, 'for business:', businessId);
      
      if (!orderId || orderId.trim() === '') {
        throw new HttpException(
          'Order ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const order = await this.salesService.getSalesOrderById(businessId, orderId);
      
      if (!order) {
        throw new HttpException(
          'Sales order not found', 
          HttpStatus.NOT_FOUND
        );
      }
      
      return {
        success: true,
        data: order,
        message: 'Sales order fetched successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error fetching order:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Sales order not found'
        }, 
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Post('orders/:businessId')
  async createSalesOrder(
    @Param('businessId') businessId: string,
    @Body() createDto: CreateSalesOrderDto,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: SalesOrder; message: string }> {
    try {
      console.log('Sales: Creating order for business:', businessId);
      console.log('Sales: Order data:', JSON.stringify(createDto, null, 2));
      
      if (!businessId || businessId.trim() === '') {
        throw new HttpException(
          'Business ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const order = await this.salesService.createSalesOrder(businessId, createDto);
      return {
        success: true,
        data: order,
        message: 'Sales order created successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error creating order:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create sales order'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put('orders/:businessId/:orderId')
  async updateSalesOrder(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateSalesOrderDto,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: SalesOrder; message: string }> {
    try {
      console.log('Sales: Updating order:', orderId, 'for business:', businessId);
      console.log('Sales: Update data:', JSON.stringify(updateDto, null, 2));
      
      if (!orderId || orderId.trim() === '') {
        throw new HttpException(
          'Order ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const order = await this.salesService.updateSalesOrder(businessId, orderId, updateDto);
      return {
        success: true,
        data: order,
        message: 'Sales order updated successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error updating order:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update sales order'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete('orders/:businessId/:orderId')
  async deleteSalesOrder(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Sales: Deleting order:', orderId, 'for business:', businessId);
      
      if (!orderId || orderId.trim() === '') {
        throw new HttpException(
          'Order ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      await this.salesService.deleteSalesOrder(businessId, orderId);
      return {
        success: true,
        message: 'Sales order deleted successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error deleting order:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete sales order'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('stats/:businessId')
  async getSalesStats(
    @Param('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Sales: Getting stats for business:', businessId);
      console.log('Sales: Date range:', startDate, 'to', endDate);
      
      // Call service with only businessId as it expects 1 argument
      const stats = await this.salesService.getSalesStats(businessId);
      return {
        success: true,
        data: stats,
        message: 'Sales stats fetched successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error fetching stats:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch sales stats'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('orders/:businessId/:orderId/status')
  async updateOrderStatus(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Body() statusData: UpdateStatusDto,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: SalesOrder; message: string }> {
    try {
      console.log('Sales: Updating order status:', orderId, 'to:', statusData.status);
      
      if (!orderId || orderId.trim() === '') {
        throw new HttpException(
          'Order ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      if (!statusData.status) {
        throw new HttpException(
          'Status is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const validStatuses: OrderStatus[] = ['Draft', 'Created', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(statusData.status)) {
        throw new HttpException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const order = await this.salesService.updateOrderStatus(businessId, orderId, statusData.status);
      return {
        success: true,
        data: order,
        message: 'Order status updated successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error updating order status:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update order status'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('orders/:businessId/:orderId/convert-to-invoice')
  async convertToInvoice(
    @Param('businessId') businessId: string,
    @Param('orderId') orderId: string,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: { invoiceId: string }; message: string }> {
    try {
      console.log('Sales: Converting order to invoice:', orderId);
      
      if (!orderId || orderId.trim() === '') {
        throw new HttpException(
          'Order ID is required', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const result = await this.salesService.convertToInvoice(businessId, orderId);
      
      if (!result || !result.invoiceId) {
        throw new HttpException(
          'Failed to convert order to invoice', 
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return {
        success: true,
        data: { invoiceId: result.invoiceId },
        message: 'Sales order converted to invoice successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error converting to invoice:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to convert to invoice'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('debug/businesses')
  async getBusinessIds(
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; data: string[]; message: string }> {
    try {
      console.log('Sales: Getting all business IDs for debug');
      
      const businessIds = await this.salesService.getAllBusinessIds();
      return {
        success: true,
        data: businessIds || [],
        message: 'Business IDs fetched successfully'
      };
    } catch (error: any) {
      console.error('Sales: Error getting business IDs:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get business IDs'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}