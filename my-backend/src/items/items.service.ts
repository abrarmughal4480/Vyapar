import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateItemDto, UpdateItemDto } from './dto/items.dto';

export interface Item {
  id: string;
  businessId: string;
  name: string;
  category: string;
  subcategory: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  sku: string;
  description?: string;
  supplier?: string;
  status: 'Active' | 'Inactive' | 'Discontinued';
  type?: 'Product' | 'Service';
  imageUrl?: string;
  openingQuantity?: number;
  atPrice?: number;
  asOfDate?: string;
  location?: string;
  taxRate?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ItemsService {
  private items: Item[] = [];
  private nextId = 1;

  private generateId(): string {
    return `item_${this.nextId++}_${Date.now()}`;
  }

  async findAll(businessId: string): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => item.businessId === businessId && item.isActive);
    } catch (error) {
      throw error;
    }
  }

  async findOne(businessId: string, id: string): Promise<Item> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      if (!id) {
        throw new BadRequestException('Item ID is required');
      }

      const item = this.items.find(item => 
        item.businessId === businessId && item.id === id && item.isActive
      );
      
      if (!item) {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      
      return item;
    } catch (error) {
      throw error;
    }
  }

  async create(businessId: string, createItemDto: CreateItemDto): Promise<Item> {
    try {
      console.log('ItemsService.create called with:', { businessId, createItemDto });
      
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }

      // Validate required fields
      if (!createItemDto.name?.trim()) {
        throw new BadRequestException('Item name is required');
      }

      if (!createItemDto.sku?.trim()) {
        throw new BadRequestException('SKU is required');
      }

      if (!createItemDto.category?.trim()) {
        throw new BadRequestException('Category is required');
      }

      if (!createItemDto.salePrice || createItemDto.salePrice <= 0) {
        throw new BadRequestException('Sale price must be greater than 0');
      }

      if (!createItemDto.purchasePrice || createItemDto.purchasePrice <= 0) {
        throw new BadRequestException('Purchase price must be greater than 0');
      }

      // Check for duplicate SKU
      const existingSku = this.items.find(item => 
        item.businessId === businessId && 
        item.sku === createItemDto.sku!.trim() && 
        item.isActive
      );
      
      if (existingSku) {
        throw new BadRequestException(`Item with SKU ${createItemDto.sku} already exists`);
      }

      const newItem: Item = {
        id: this.generateId(),
        businessId,
        name: createItemDto.name.trim(),
        category: createItemDto.category.trim(),
        subcategory: createItemDto.subcategory?.trim() || '',
        salePrice: Number(createItemDto.salePrice) || 0,
        purchasePrice: Number(createItemDto.purchasePrice) || 0,
        stock: Number(createItemDto.stock) || 0,
        minStock: Number(createItemDto.minStock) || 0,
        unit: createItemDto.unit || 'Piece',
        sku: createItemDto.sku.trim(),
        description: createItemDto.description?.trim() || '',
        supplier: createItemDto.supplier?.trim() || '',
        status: createItemDto.status || 'Active',
        type: createItemDto.type || 'Product',
        imageUrl: createItemDto.imageUrl || '',
        openingQuantity: Number(createItemDto.openingQuantity) || 0,
        atPrice: Number(createItemDto.atPrice) || 0,
        asOfDate: createItemDto.asOfDate || new Date().toISOString().split('T')[0],
        location: createItemDto.location?.trim() || '',
        taxRate: Number(createItemDto.taxRate) || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Created new item:', newItem);
      this.items.push(newItem);
      
      return newItem;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async update(businessId: string, id: string, updateItemDto: UpdateItemDto): Promise<Item> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      if (!id) {
        throw new BadRequestException('Item ID is required');
      }

      const itemIndex = this.items.findIndex(item => 
        item.businessId === businessId && item.id === id && item.isActive
      );
      
      if (itemIndex === -1) {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }

      // Validate updated fields
      if (updateItemDto.name !== undefined && !updateItemDto.name?.trim()) {
        throw new BadRequestException('Item name cannot be empty');
      }

      if (updateItemDto.salePrice !== undefined && updateItemDto.salePrice <= 0) {
        throw new BadRequestException('Sale price must be greater than 0');
      }

      if (updateItemDto.purchasePrice !== undefined && updateItemDto.purchasePrice <= 0) {
        throw new BadRequestException('Purchase price must be greater than 0');
      }

      if (updateItemDto.stock !== undefined && updateItemDto.stock < 0) {
        throw new BadRequestException('Stock cannot be negative');
      }

      if (updateItemDto.minStock !== undefined && updateItemDto.minStock < 0) {
        throw new BadRequestException('Minimum stock cannot be negative');
      }

      // Check for duplicate SKU if updating SKU
      if (updateItemDto.sku?.trim()) {
        const existingSku = this.items.find(item => 
          item.businessId === businessId && 
          item.sku === updateItemDto.sku!.trim() && 
          item.id !== id &&
          item.isActive
        );
        
        if (existingSku) {
          throw new BadRequestException(`Item with SKU ${updateItemDto.sku} already exists`);
        }
      }

      // Clean and prepare update data
      const updateData: Partial<Item> = {
        ...updateItemDto,
        updatedAt: new Date(),
      };

      // Clean string fields
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.category) updateData.category = updateData.category.trim();
      if (updateData.subcategory) updateData.subcategory = updateData.subcategory.trim();
      if (updateData.sku) updateData.sku = updateData.sku.trim();
      if (updateData.description) updateData.description = updateData.description.trim();
      if (updateData.supplier) updateData.supplier = updateData.supplier.trim();
      if (updateData.location) updateData.location = updateData.location.trim();

      // Convert numbers
      if (updateData.salePrice !== undefined) updateData.salePrice = Number(updateData.salePrice);
      if (updateData.purchasePrice !== undefined) updateData.purchasePrice = Number(updateData.purchasePrice);
      if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
      if (updateData.minStock !== undefined) updateData.minStock = Number(updateData.minStock);
      if (updateData.openingQuantity !== undefined) updateData.openingQuantity = Number(updateData.openingQuantity);
      if (updateData.atPrice !== undefined) updateData.atPrice = Number(updateData.atPrice);
      if (updateData.taxRate !== undefined) updateData.taxRate = Number(updateData.taxRate);

      this.items[itemIndex] = {
        ...this.items[itemIndex],
        ...updateData,
      };

      return this.items[itemIndex];
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async remove(businessId: string, id: string): Promise<void> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      if (!id) {
        throw new BadRequestException('Item ID is required');
      }

      const itemIndex = this.items.findIndex(item => 
        item.businessId === businessId && item.id === id && item.isActive
      );
      
      if (itemIndex === -1) {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }

      // Soft delete
      this.items[itemIndex].isActive = false;
      this.items[itemIndex].updatedAt = new Date();
    } catch (error) {
      throw error;
    }
  }

  async getCount(businessId: string): Promise<number> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => item.businessId === businessId && item.isActive).length;
    } catch (error) {
      throw error;
    }
  }

  async updateStock(businessId: string, id: string, quantity: number): Promise<Item> {
    try {
      const item = await this.findOne(businessId, id);
      
      if (item.stock + quantity < 0) {
        throw new BadRequestException('Stock cannot be negative');
      }
      
      const itemIndex = this.items.findIndex(i => i.id === id);
      this.items[itemIndex].stock += quantity;
      this.items[itemIndex].updatedAt = new Date();
      
      return this.items[itemIndex];
    } catch (error) {
      throw error;
    }
  }

  async getLowStockItems(businessId: string): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive && 
        item.minStock > 0 && 
        item.stock <= item.minStock
      );
    } catch (error) {
      throw error;
    }
  }

  async getOutOfStockItems(businessId: string): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive && 
        item.stock === 0
      );
    } catch (error) {
      throw error;
    }
  }

  async getItemsByCategory(businessId: string, category: string): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      if (!category) {
        throw new BadRequestException('Category is required');
      }
      
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive &&
        item.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      throw error;
    }
  }

  async searchItems(businessId: string, searchTerm: string): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      if (!searchTerm) {
        return this.findAll(businessId);
      }
      
      const term = searchTerm.toLowerCase().trim();
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive &&
        (item.name.toLowerCase().includes(term) ||
         item.sku.toLowerCase().includes(term) ||
         item.category.toLowerCase().includes(term) ||
         item.subcategory.toLowerCase().includes(term) ||
         item.supplier?.toLowerCase().includes(term) ||
         item.description?.toLowerCase().includes(term))
      );
    } catch (error) {
      throw error;
    }
  }

  async getInventoryValue(businessId: string): Promise<number> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      const activeItems = this.items.filter(item => item.businessId === businessId && item.isActive);
      return activeItems.reduce((total, item) => {
        const stockValue = item.stock * (item.atPrice || item.purchasePrice || 0);
        return total + stockValue;
      }, 0);
    } catch (error) {
      throw error;
    }
  }

  async getStats(businessId: string): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    activeItems: number;
    inactiveItems: number;
    productItems: number;
    serviceItems: number;
    categories: string[];
  }> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      const allItems = this.items.filter(item => item.businessId === businessId);
      const activeItems = allItems.filter(item => item.isActive);
      const inactiveItems = allItems.filter(item => !item.isActive);
      
      const totalValue = activeItems.reduce((total, item) => {
        const stockValue = item.stock * (item.atPrice || item.purchasePrice || 0);
        return total + stockValue;
      }, 0);

      const lowStockItems = activeItems.filter(item => 
        item.minStock > 0 && item.stock <= item.minStock
      );

      const outOfStockItems = activeItems.filter(item => item.stock === 0);
      
      const activeStatusItems = activeItems.filter(item => item.status === 'Active');
      
      const productItems = activeItems.filter(item => item.type === 'Product');
      const serviceItems = activeItems.filter(item => item.type === 'Service');
      
      const categories = [...new Set(activeItems.map(item => item.category))];
      
      return {
        totalItems: activeItems.length,
        totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        activeItems: activeStatusItems.length,
        inactiveItems: inactiveItems.length,
        productItems: productItems.length,
        serviceItems: serviceItems.length,
        categories,
      };
    } catch (error) {
      throw error;
    }
  }

  // Additional utility methods
  async bulkUpdateStock(businessId: string, updates: { id: string; quantity: number }[]): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      const updatedItems: Item[] = [];
      
      for (const update of updates) {
        try {
          const updatedItem = await this.updateStock(businessId, update.id, update.quantity);
          updatedItems.push(updatedItem);
        } catch (error) {
          console.error(`Failed to update stock for item ${update.id}:`, error);
          // Continue with other updates
        }
      }
      
      return updatedItems;
    } catch (error) {
      throw error;
    }
  }

  async getItemsByStatus(businessId: string, status: 'Active' | 'Inactive' | 'Discontinued'): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive && 
        item.status === status
      );
    } catch (error) {
      throw error;
    }
  }

  async getItemsByType(businessId: string, type: 'Product' | 'Service'): Promise<Item[]> {
    try {
      if (!businessId) {
        throw new BadRequestException('Business ID is required');
      }
      
      return this.items.filter(item => 
        item.businessId === businessId && 
        item.isActive && 
        item.type === type
      );
    } catch (error) {
      throw error;
    }
  }
}