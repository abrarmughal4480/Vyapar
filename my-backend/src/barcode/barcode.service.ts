import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarcodeDto, BarcodeFormat } from './dto/create-barcode.dto';

export interface BulkGenerationResult {
  successful: Array<{
    code: string;
    barcodeId: string;
    productName: string;
  }>;
  failed: Array<{
    code: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);
  private defaultBusinessId: string | null = null;

  constructor(private prisma: PrismaService) {}

  private async ensureDefaultBusiness(): Promise<string> {
    if (this.defaultBusinessId) {
      return this.defaultBusinessId;
    }

    try {
      const existingBusiness = await this.prisma.business.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      if (existingBusiness) {
        this.defaultBusinessId = existingBusiness.id;
        this.logger.log(`Using existing business: ${existingBusiness.name} (${this.defaultBusinessId})`);
        return this.defaultBusinessId;
      }

      this.logger.log('No businesses found, creating default business');
      const defaultBusiness = await this.prisma.business.create({
        data: {
          name: 'Default Business',
          email: 'admin@defaultbusiness.com',
          phone: '0000000000',
          address: 'Default Address'
        }
      });

      this.defaultBusinessId = defaultBusiness.id;
      this.logger.log(`Created default business: ${defaultBusiness.name} (${this.defaultBusinessId})`);
      return this.defaultBusinessId;
    } catch (error) {
      this.logger.error('Error ensuring default business:', error);
      throw new Error('Failed to create or find default business');
    }
  }

  async generateBarcode(createBarcodeDto: CreateBarcodeDto) {
    const { productName, skuCode, barcodeFormat, price, category } = createBarcodeDto;

    try {
      this.logger.log(`Generating barcode for product: ${productName}, SKU: ${skuCode}`);

      const businessId = await this.ensureDefaultBusiness();

      let product = await this.prisma.product.findUnique({
        where: { sku: skuCode },
      });

      if (product) {
        this.logger.log(`Updating existing product with SKU: ${skuCode}`);
        product = await this.prisma.product.update({
          where: { sku: skuCode },
          data: {
            name: productName,
            salePrice: price || 0,
            category: category || 'general',
          },
        });
      } else {
        this.logger.log(`Creating new product with SKU: ${skuCode} for business: ${businessId}`);
        product = await this.prisma.product.create({
          data: {
            name: productName,
            sku: skuCode,
            salePrice: price || 0,
            purchasePrice: price ? price * 0.8 : 0,
            stock: 0,
            unit: 'pcs',
            category: category || 'general',
            businessId: businessId,
          },
        });
      }

      const existingBarcode = await this.prisma.barcode.findFirst({
        where: {
          OR: [
            { productId: product.id },
            { code: skuCode }
          ]
        },
      });

      if (existingBarcode) {
        this.logger.log(`Barcode already exists for product: ${productName}`);
        return {
          id: existingBarcode.id,
          code: existingBarcode.code,
          format: existingBarcode.format,
          productName: product.name,
          productId: product.id,
          createdAt: existingBarcode.createdAt,
        };
      }

      this.logger.log(`Creating new barcode for product ID: ${product.id}`);
      const barcode = await this.prisma.barcode.create({
        data: {
          code: skuCode,
          format: barcodeFormat || BarcodeFormat.CODE128,
          productId: product.id,
          businessId: businessId,
        },
        include: {
          product: true,
        },
      });

      this.logger.log(`Barcode generated successfully for product: ${productName}`);

      return {
        id: barcode.id,
        code: barcode.code,
        format: barcode.format,
        productName: product.name,
        productId: product.id,
        createdAt: barcode.createdAt,
      };
    } catch (error) {
      this.logger.error('Error generating barcode:', error);
      this.logger.error('Error stack:', error.stack);
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  async bulkGenerateBarcodes(codes: string[]): Promise<BulkGenerationResult> {
    const successful: Array<{
      code: string;
      barcodeId: string;
      productName: string;
    }> = [];
    
    const failed: Array<{
      code: string;
      error: string;
    }> = [];

    this.logger.log(`Starting bulk generation for ${codes.length} codes`);

    for (const code of codes) {
      try {
        const result = await this.generateBarcode({
          productName: `Product ${code}`,
          skuCode: code.trim(),
          barcodeFormat: BarcodeFormat.CODE128,
        });

        successful.push({
          code: code.trim(),
          barcodeId: result.id,
          productName: result.productName,
        });
      } catch (error) {
        this.logger.error(`Failed to generate barcode for code ${code}:`, error);
        failed.push({
          code: code.trim(),
          error: error.message,
        });
      }
    }

    this.logger.log(`Bulk generation completed: ${successful.length} successful, ${failed.length} failed`);

    return {
      successful,
      failed,
      summary: {
        total: codes.length,
        successful: successful.length,
        failed: failed.length,
      },
    };
  }

  async getBarcodeHistory() {
    try {
      this.logger.log('Fetching barcode history');
      
      const barcodes = await this.prisma.barcode.findMany({
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      return barcodes.map(barcode => ({
        id: barcode.id,
        code: barcode.code,
        format: barcode.format,
        product: {
          id: barcode.product.id,
          name: barcode.product.name,
          sku: barcode.product.sku,
          price: barcode.product.salePrice,
          category: barcode.product.category,
        },
        createdAt: barcode.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error fetching barcode history:', error);
      throw new Error(`Failed to fetch barcode history: ${error.message}`);
    }
  }

  async getBarcodeHistoryByBusiness(businessId: string) {
    try {
      this.logger.log(`Fetching barcode history for business: ${businessId}`);
      
      const barcodes = await this.prisma.barcode.findMany({
        where: {
          businessId: businessId,
        },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      return barcodes.map(barcode => ({
        id: barcode.id,
        code: barcode.code,
        format: barcode.format,
        product: {
          id: barcode.product.id,
          name: barcode.product.name,
          sku: barcode.product.sku,
          price: barcode.product.salePrice,
          category: barcode.product.category,
        },
        createdAt: barcode.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error fetching business barcode history:', error);
      return [];
    }
  }

  async deleteBarcode(id: string) {
    try {
      this.logger.log(`Deleting barcode: ${id}`);
      
      await this.prisma.barcode.delete({
        where: { id },
      });

      this.logger.log(`Barcode deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error('Error deleting barcode:', error);
      throw new Error(`Failed to delete barcode: ${error.message}`);
    }
  }

  async findBarcodeByCode(code: string) {
    try {
      this.logger.log(`Finding barcode by code: ${code}`);
      
      return await this.prisma.barcode.findFirst({
        where: { code },
        include: {
          product: true,
        },
      });
    } catch (error) {
      this.logger.error('Error finding barcode:', error);
      return null;
    }
  }
}
