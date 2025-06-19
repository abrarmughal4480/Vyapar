import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpStatus, 
  HttpException,
  ValidationPipe,
  UsePipes,
  BadRequestException
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto } from './dto/items.dto';

@Controller('items')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // Health check endpoint - must come before parameterized routes
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Items service is healthy',
      timestamp: new Date().toISOString()
    };
  }

  // Route order is important - more specific routes should come first
  @Get(':businessId/stats')
  async getStats(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const stats = await this.itemsService.getStats(businessId);
      return {
        success: true,
        data: stats,
        message: 'Stats fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch stats'
      }, status);
    }
  }

  @Get(':businessId/count')
  async getCount(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const count = await this.itemsService.getCount(businessId);
      return {
        success: true,
        data: { count },
        message: 'Items count fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch count'
      }, status);
    }
  }

  @Get(':businessId/low-stock')
  async getLowStockItems(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const items = await this.itemsService.getLowStockItems(businessId);
      return {
        success: true,
        data: items,
        message: 'Low stock items fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch low stock items'
      }, status);
    }
  }

  @Get(':businessId/out-of-stock')
  async getOutOfStockItems(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const items = await this.itemsService.getOutOfStockItems(businessId);
      return {
        success: true,
        data: items,
        message: 'Out of stock items fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch out of stock items'
      }, status);
    }
  }

  @Get(':businessId/inventory-value')
  async getInventoryValue(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const value = await this.itemsService.getInventoryValue(businessId);
      return {
        success: true,
        data: { inventoryValue: value },
        message: 'Inventory value calculated successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to calculate inventory value'
      }, status);
    }
  }

  @Get(':businessId/search')
  async searchItems(
    @Param('businessId') businessId: string,
    @Query('q') searchTerm?: string
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const items = await this.itemsService.searchItems(businessId, searchTerm || '');
      return {
        success: true,
        data: items,
        message: searchTerm ? 'Search completed successfully' : 'All items fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to search items'
      }, status);
    }
  }

  @Get(':businessId/category/:category')
  async getItemsByCategory(
    @Param('businessId') businessId: string,
    @Param('category') category: string
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!category?.trim()) {
        throw new BadRequestException('Category is required');
      }

      const items = await this.itemsService.getItemsByCategory(businessId, decodeURIComponent(category));
      return {
        success: true,
        data: items,
        message: `Items in category ${category} fetched successfully`
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch items by category'
      }, status);
    }
  }

  @Get(':businessId/status/:status')
  async getItemsByStatus(
    @Param('businessId') businessId: string,
    @Param('status') status: 'Active' | 'Inactive' | 'Discontinued'
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!['Active', 'Inactive', 'Discontinued'].includes(status)) {
        throw new BadRequestException('Invalid status. Must be Active, Inactive, or Discontinued');
      }

      const items = await this.itemsService.getItemsByStatus(businessId, status);
      return {
        success: true,
        data: items,
        message: `Items with status ${status} fetched successfully`
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch items by status'
      }, status);
    }
  }

  @Get(':businessId/type/:type')
  async getItemsByType(
    @Param('businessId') businessId: string,
    @Param('type') type: 'Product' | 'Service'
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!['Product', 'Service'].includes(type)) {
        throw new BadRequestException('Invalid type. Must be Product or Service');
      }

      const items = await this.itemsService.getItemsByType(businessId, type);
      return {
        success: true,
        data: items,
        message: `${type}s fetched successfully`
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch items by type'
      }, status);
    }
  }

  @Put(':businessId/bulk-stock')
  async bulkUpdateStock(
    @Param('businessId') businessId: string,
    @Body() bulkStockData: { updates: { id: string; quantity: number }[] }
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!Array.isArray(bulkStockData.updates)) {
        throw new BadRequestException('Updates must be an array');
      }

      // Validate each update
      for (const update of bulkStockData.updates) {
        if (!update.id?.trim()) {
          throw new BadRequestException('Each update must have a valid ID');
        }
        if (typeof update.quantity !== 'number' || isNaN(update.quantity)) {
          throw new BadRequestException('Each update must have a valid quantity');
        }
      }

      const items = await this.itemsService.bulkUpdateStock(businessId, bulkStockData.updates);
      return {
        success: true,
        data: items,
        message: `${items.length} items updated successfully`
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to bulk update stock'
      }, status);
    }
  }

  @Get(':businessId/:id')
  async findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!id?.trim()) {
        throw new BadRequestException('Item ID is required');
      }

      const item = await this.itemsService.findOne(businessId, id);
      return {
        success: true,
        data: item,
        message: 'Item fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.NOT_FOUND;
      throw new HttpException({
        success: false,
        message: error.message || 'Item not found'
      }, status);
    }
  }

  @Get(':businessId')
  async findAll(@Param('businessId') businessId: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      const items = await this.itemsService.findAll(businessId);
      return {
        success: true,
        data: items,
        message: 'Items fetched successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch items'
      }, status);
    }
  }

  @Post(':businessId')
  async create(@Param('businessId') businessId: string, @Body() createItemDto: CreateItemDto) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      console.log('Creating item for business:', businessId);
      console.log('Item data:', createItemDto);
      
      const item = await this.itemsService.create(businessId, createItemDto);
      return {
        success: true,
        data: item,
        message: 'Item created successfully'
      };
    } catch (error: any) {
      console.error('Error creating item:', error);
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create item'
      }, status);
    }
  }

  @Put(':businessId/:id')
  async update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!id?.trim()) {
        throw new BadRequestException('Item ID is required');
      }

      console.log('Updating item:', { businessId, id, updateItemDto });
      
      const item = await this.itemsService.update(businessId, id, updateItemDto);
      return {
        success: true,
        data: item,
        message: 'Item updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating item:', error);
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update item'
      }, status);
    }
  }

  @Delete(':businessId/:id')
  async remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!id?.trim()) {
        throw new BadRequestException('Item ID is required');
      }

      await this.itemsService.remove(businessId, id);
      return {
        success: true,
        message: 'Item deleted successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete item'
      }, status);
    }
  }

  @Put(':businessId/:id/stock')
  async updateStock(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() stockData: { quantity: number }
  ) {
    try {
      if (!businessId?.trim()) {
        throw new BadRequestException('Business ID is required');
      }

      if (!id?.trim()) {
        throw new BadRequestException('Item ID is required');
      }

      if (typeof stockData.quantity !== 'number' || isNaN(stockData.quantity)) {
        throw new BadRequestException('Quantity must be a valid number');
      }

      const item = await this.itemsService.updateStock(businessId, id, stockData.quantity);
      return {
        success: true,
        data: item,
        message: 'Stock updated successfully'
      };
    } catch (error: any) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update stock'
      }, status);
    }
  }
}