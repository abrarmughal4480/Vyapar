import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getAll(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId },
      include: {
        _count: {
          select: {
            barcodes: true,
            purchaseItems: true,
            quotationItems: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(businessId: string, createProductDto: CreateProductDto) {
    try {
      return this.prisma.product.create({
        data: {
          ...createProductDto,
          businessId,
        },
      });
    } catch (error) {
      console.error('Error creating product:', error);
      throw new BadRequestException('Failed to create product');
    }
  }

  async findAll(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId },
      include: {
        _count: {
          select: {
            barcodes: true,
            purchaseItems: true,
            quotationItems: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        barcodes: {
          select: {
            id: true,
            code: true,
            format: true,
            createdAt: true,
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(businessId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async updateStock(id: string, quantity: number, type: 'add' | 'subtract') {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = type === 'add' ? product.stock + quantity : product.stock - quantity;

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  async getLowStockProducts(businessId: string, threshold: number) {
    return this.prisma.product.findMany({
      where: {
        businessId,
        stock: {
          lte: threshold,
        },
      },
      orderBy: {
        stock: 'asc',
      },
    });
  }

  async importFromCSV(businessId: string, csvData: string) {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const products: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) continue;

      const productData: any = { businessId };
      
      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header.toLowerCase()) {
          case 'name':
            productData.name = value;
            break;
          case 'sku':
            productData.sku = value;
            break;
          case 'price':
          case 'saleprice':
            productData.salePrice = parseFloat(value) || 0;
            break;
          case 'cost':
          case 'purchaseprice':
            productData.purchasePrice = parseFloat(value) || 0;
            break;
          case 'stock':
            productData.stock = parseInt(value) || 0;
            break;
          case 'unit':
            productData.unit = value || 'pcs';
            break;
          case 'category':
            productData.category = value;
            break;
          case 'description':
            productData.description = value;
            break;
        }
      });

      if (productData.name && productData.salePrice !== undefined) {
        try {
          const product = await this.prisma.product.create({
            data: productData,
          });
          products.push(product);
        } catch (error) {
          console.error(`Failed to create product: ${productData.name}`, error);
        }
      }
    }

    return products;
  }
}
