import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { CreateBarcodeDto, BulkGenerateBarcodeDto } from './dto/create-barcode.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('barcode')
export class BarcodeController {
  private readonly logger = new Logger(BarcodeController.name);

  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('generate')
  async generateBarcode(@Body() createBarcodeDto: CreateBarcodeDto) {
    try {
      this.logger.log('Barcode generation request received');
      this.logger.log(`Product: ${createBarcodeDto.productName}`);
      this.logger.log(`SKU: ${createBarcodeDto.skuCode}`);

      // Validate required fields
      if (!createBarcodeDto.productName || !createBarcodeDto.skuCode) {
        throw new HttpException(
          {
            success: false,
            message: 'Product name and SKU code are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.barcodeService.generateBarcode(createBarcodeDto);

      this.logger.log('Barcode generated successfully:', result.id);

      return {
        success: true,
        message: 'Barcode generated successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error generating barcode:');
      this.logger.error(error.message);
      this.logger.error('Error stack:', error.stack);
      
      // Return a more specific error message
      const statusCode = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.message || 'Failed to generate barcode';
      
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        statusCode,
      );
    }
  }

  @Post('bulk-generate')
  async bulkGenerateBarcodes(@Body() bulkGenerateDto: BulkGenerateBarcodeDto) {
    try {
      this.logger.log('Bulk barcode generation request received');
      this.logger.log(`Number of codes: ${bulkGenerateDto.codes?.length || 0}`);
      this.logger.log(`Codes: ${JSON.stringify(bulkGenerateDto.codes)}`);

      if (!bulkGenerateDto.codes || bulkGenerateDto.codes.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'At least one code is required for bulk generation',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.barcodeService.bulkGenerateBarcodes(bulkGenerateDto.codes);

      this.logger.log('Bulk generation completed:', result.summary);

      return {
        success: true,
        message: 'Bulk barcode generation completed',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error in bulk generation:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate barcodes',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  async getBarcodeHistory() {
    try {
      this.logger.log('Fetching barcode history');

      const history = await this.barcodeService.getBarcodeHistory();

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error('Error fetching barcode history:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch barcode history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history/:businessId')
  @UseGuards(JwtAuthGuard)
  async getBarcodeHistoryByBusiness(
    @Param('businessId') businessId: string,
    @Request() req: any,
  ) {
    try {
      this.logger.log('Fetching barcode history for business:', businessId);

      // Basic access control
      const userBusinessId = req.user.businessId || req.user.id;
      if (userBusinessId !== businessId && req.user.role !== 'admin') {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const history = await this.barcodeService.getBarcodeHistoryByBusiness(businessId);

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error('Error fetching business barcode history:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch barcode history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteBarcode(@Param('id') id: string) {
    try {
      this.logger.log('Deleting barcode:', id);

      await this.barcodeService.deleteBarcode(id);

      return {
        success: true,
        message: 'Barcode deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting barcode:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete barcode',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  async healthCheck() {
    try {
      // Test database connection
      await this.barcodeService.getBarcodeHistory();
      
      return {
        success: true,
        message: 'Barcode service is running',
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        message: 'Barcode service health check failed',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      };
    }
  }
}
