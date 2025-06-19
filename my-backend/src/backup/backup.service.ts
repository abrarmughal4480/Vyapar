import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private prisma: PrismaService) {}

  // Add backup table creation method
  async createBackupTable() {
    try {
      this.logger.log('Creating backup table...');
      
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS backup (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          size VARCHAR(20) NOT NULL,
          data JSONB NOT NULL,
          "businessId" VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index for better performance
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_backup_business_id 
        ON backup("businessId")
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_backup_created_at 
        ON backup("createdAt")
      `;

      this.logger.log('Backup table created successfully');
      return { success: true, message: 'Backup table created successfully' };
    } catch (error) {
      this.logger.error('Error creating backup table:', error);
      return { success: false, message: `Failed to create backup table: ${error.message}` };
    }
  }

  // Enhanced backup creation with table storage
  async createBackup(businessId: string, includeData: any = {}) {
    try {
      const backupData: any = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        businessId,
      };

      // Backup customers
      if (includeData.customers !== false) {
        const customers = await this.prisma.customer.findMany({
          where: { businessId },
          include: {
            quotations: true,
            deliveryChallans: true,
          },
        });
        backupData.customers = customers;
      }

      // Backup products
      if (includeData.products !== false) {
        const products = await this.prisma.product.findMany({
          where: { businessId },
          include: {
            barcodes: true,
            purchaseItems: true,
            quotationItems: true,
          },
        });
        backupData.products = products;
      }

      // Backup sales instead of invoices
      if (includeData.sales !== false) {
        const sales = await this.prisma.sale.findMany({
          where: { businessId },
        });
        backupData.sales = sales;
      }

      // Backup quotations
      if (includeData.quotations !== false) {
        const quotations = await this.prisma.quotation.findMany({
          where: { businessId },
          include: {
            items: true,
            customer: true,
          },
        });
        backupData.quotations = quotations;
      }

      // Backup purchases
      if (includeData.purchases !== false) {
        const purchases = await this.prisma.purchase.findMany({
          where: { businessId },
          include: {
            items: true,
          },
        });
        backupData.purchases = purchases;
      }

      // Backup transactions
      if (includeData.transactions !== false) {
        const transactions = await this.prisma.transaction.findMany({
          where: { businessId },
        });
        backupData.transactions = transactions;
      }

      // Backup expenses
      if (includeData.expenses !== false) {
        const expenses = await this.prisma.expense.findMany({
          where: { businessId },
        });
        backupData.expenses = expenses;
      }

      // Try to store in backup table if it exists
      try {
        const tableExists = await this.checkBackupTableExists();
        
        if (tableExists) {
          const backupName = `${includeData.type || 'full'}-backup-${new Date().toISOString().split('T')[0]}`;
          const backupSize = `${(JSON.stringify(backupData).length / 1024 / 1024).toFixed(2)} MB`;
          
          await this.prisma.$executeRaw`
            INSERT INTO backup (name, type, size, data, "businessId")
            VALUES (${backupName}, ${includeData.type || 'full'}, ${backupSize}, ${JSON.stringify(backupData)}, ${businessId})
          `;
          
          this.logger.log(`Backup stored in database: ${backupName}`);
        } else {
          this.logger.warn('Backup table does not exist, skipping database storage');
        }
      } catch (tableError) {
        this.logger.warn('Could not store backup in table:', tableError.message);
        // Continue without failing - backup data is still returned
      }

      return {
        success: true,
        data: backupData,
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        message: 'Failed to create backup',
      };
    }
  }

  async restoreBackup(businessId: string, backupData: any) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const restoredItems: any = {
          customers: 0,
          products: 0,
          sales: 0,
          purchases: 0,
          transactions: 0,
          quotations: 0,
          expenses: 0,
        };

        // Clear existing data first
        await Promise.all([
          prisma.quotationItem.deleteMany({
            where: { quotation: { businessId } },
          }),
          prisma.purchaseItem.deleteMany({
            where: { purchase: { businessId } },
          }),
          prisma.challanItem.deleteMany({
            where: { challan: { businessId } },
          }),
          prisma.barcode.deleteMany({ where: { businessId } }),
        ]);

        await Promise.all([
          prisma.quotation.deleteMany({ where: { businessId } }),
          prisma.purchase.deleteMany({ where: { businessId } }),
          prisma.deliveryChallan.deleteMany({ where: { businessId } }),
          prisma.transaction.deleteMany({ where: { businessId } }),
          prisma.expense.deleteMany({ where: { businessId } }),
          prisma.sale.deleteMany({ where: { businessId } }),
          prisma.product.deleteMany({ where: { businessId } }),
          prisma.customer.deleteMany({ where: { businessId } }),
        ]);

        // Restore customers
        if (backupData.customers?.length > 0) {
          for (const customer of backupData.customers) {
            await prisma.customer.create({
              data: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address,
                gstNumber: customer.gstNumber,
                businessId,
              },
            });
            restoredItems.customers++;
          }
        }

        // Restore products
        if (backupData.products?.length > 0) {
          for (const product of backupData.products) {
            const createdProduct = await prisma.product.create({
              data: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                description: product.description,
                salePrice: product.salePrice,
                purchasePrice: product.purchasePrice,
                stock: product.stock,
                unit: product.unit,
                category: product.category,
                businessId,
              },
            });

            // Restore barcodes
            if (product.barcodes?.length > 0) {
              for (const barcode of product.barcodes) {
                await prisma.barcode.create({
                  data: {
                    code: barcode.code,
                    format: barcode.format,
                    productId: createdProduct.id,
                    businessId,
                  },
                });
              }
            }
            restoredItems.products++;
          }
        }

        // Restore sales
        if (backupData.sales?.length > 0) {
          for (const sale of backupData.sales) {
            await prisma.sale.create({
              data: {
                id: sale.id,
                customer: sale.customer,
                amount: sale.amount,
                items: sale.items,
                date: sale.date,
                businessId,
              },
            });
            restoredItems.sales++;
          }
        }

        // Restore quotations
        if (backupData.quotations?.length > 0) {
          for (const quotation of backupData.quotations) {
            const createdQuotation = await prisma.quotation.create({
              data: {
                id: quotation.id,
                quotationNo: quotation.quotationNo,
                date: quotation.date,
                validUntil: quotation.validUntil,
                customerId: quotation.customerId,
                businessId,
                subtotal: quotation.subtotal,
                tax: quotation.tax,
                discount: quotation.discount,
                total: quotation.total,
                status: quotation.status,
                notes: quotation.notes,
              },
            });

            // Restore quotation items
            if (quotation.items?.length > 0) {
              for (const item of quotation.items) {
                await prisma.quotationItem.create({
                  data: {
                    quotationId: createdQuotation.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                  },
                });
              }
            }
            restoredItems.quotations++;
          }
        }

        // Restore purchases
        if (backupData.purchases?.length > 0) {
          for (const purchase of backupData.purchases) {
            const createdPurchase = await prisma.purchase.create({
              data: {
                id: purchase.id,
                purchaseNo: purchase.purchaseNo,
                date: purchase.date,
                supplier: purchase.supplier,
                businessId,
                subtotal: purchase.subtotal,
                tax: purchase.tax,
                discount: purchase.discount,
                total: purchase.total,
                status: purchase.status,
                notes: purchase.notes,
              },
            });

            // Restore purchase items
            if (purchase.items?.length > 0) {
              for (const item of purchase.items) {
                await prisma.purchaseItem.create({
                  data: {
                    purchaseId: createdPurchase.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                  },
                });
              }
            }
            restoredItems.purchases++;
          }
        }

        // Restore transactions
        if (backupData.transactions?.length > 0) {
          for (const transaction of backupData.transactions) {
            await prisma.transaction.create({
              data: {
                id: transaction.id,
                type: transaction.type,
                party: transaction.party,
                amount: transaction.amount,
                mode: transaction.mode,
                description: transaction.description,
                date: transaction.date,
                reference: transaction.reference,
                businessId,
              },
            });
            restoredItems.transactions++;
          }
        }

        // Restore expenses
        if (backupData.expenses?.length > 0) {
          for (const expense of backupData.expenses) {
            await prisma.expense.create({
              data: {
                id: expense.id,
                category: expense.category,
                amount: expense.amount,
                date: expense.date,
                description: expense.description,
                businessId,
              },
            });
            restoredItems.expenses++;
          }
        }

        return {
          success: true,
          restoredItems,
        };
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        message: 'Failed to restore backup',
      };
    }
  }

  // Fix backup table existence check
  async checkBackupTableExists(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM backup LIMIT 1`;
      return true;
    } catch (error: any) {
      // Check for table not exists error
      if (error.code === 'P2010' && error.meta?.code === '42P01') {
        this.logger.warn('Backup table does not exist');
        return false;
      }
      // Re-throw other errors
      this.logger.error('Error checking backup table existence:', error);
      return false;
    }
  }

  // Enhanced getBackupHistory with proper error handling
  async getBackupHistory(businessId: string) {
    try {
      // Check if backup table exists first
      const tableExists = await this.checkBackupTableExists();
      
      if (!tableExists) {
        this.logger.warn('Backup table does not exist, returning empty history');
        return [];
      }

      // Try to get backup history from database
      const backups = await this.prisma.$queryRaw`
        SELECT id, name, type, size, "createdAt" 
        FROM backup 
        WHERE "businessId" = ${businessId} 
        ORDER BY "createdAt" DESC
      `;
      
      return Array.isArray(backups) ? backups.map((backup: any) => ({
        id: backup.id,
        name: backup.name,
        type: backup.type,
        size: backup.size,
        date: new Date(backup.createdAt).toLocaleDateString(),
      })) : [];
    } catch (error: any) {
      this.logger.warn('Error getting backup history:', error.message);
      return [];
    }
  }

  // Enhanced getBackupById with better error handling
  async getBackupById(businessId: string, backupId: number) {
    try {
      const tableExists = await this.checkBackupTableExists();
      
      if (!tableExists) {
        throw new Error('Backup table does not exist');
      }

      const backup = await this.prisma.$queryRaw`
        SELECT data FROM backup 
        WHERE id = ${backupId} AND "businessId" = ${businessId}
      `;

      if (!backup || !Array.isArray(backup) || backup.length === 0) {
        throw new Error('Backup not found');
      }

      return typeof backup[0].data === 'string' 
        ? JSON.parse(backup[0].data) 
        : backup[0].data;
    } catch (error) {
      console.error('Error getting backup by ID:', error);
      throw new Error('Backup not found or could not be retrieved');
    }
  }

  // Enhanced deleteBackup with table existence check
  async deleteBackup(businessId: string, backupId: number) {
    try {
      const tableExists = await this.checkBackupTableExists();
      
      if (!tableExists) {
        throw new Error('Backup table does not exist');
      }

      const result = await this.prisma.$executeRaw`
        DELETE FROM backup 
        WHERE id = ${backupId} AND "businessId" = ${businessId}
      `;

      if (result === 0) {
        throw new Error('Backup not found');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw new Error('Failed to delete backup');
    }
  }
}
