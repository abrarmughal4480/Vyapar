import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':businessId')
  async getAll(@Param('businessId') businessId: string) {
    try {
      const data = await this.productsService.getAll(businessId);
      return { success: true, data };
    } catch (e: any) {
      throw new HttpException({ success: false, message: e.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':businessId')
  async create(@Param('businessId') businessId: string, @Body() dto: CreateProductDto) {
    try {
      const data = await this.productsService.create(businessId, dto);
      return { success: true, data };
    } catch (e: any) {
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:productId')
  async update(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto
  ) {
    try {
      const data = await this.productsService.update(businessId, productId, dto);
      return { success: true, data };
    } catch (e: any) {
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':businessId/import')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @Param('businessId') businessId: string,
    @UploadedFile() file: any
  ) {
    try {
      if (!file) {
        throw new Error('No file uploaded');
      }

      const csvData = file.buffer.toString('utf-8');
      const data = await this.productsService.importFromCSV(businessId, csvData);
      return { success: true, data, message: `${data.length} products imported successfully` };
    } catch (e: any) {
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
