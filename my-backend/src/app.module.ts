import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
// import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CashBankModule } from './cash-bank/cash-bank.module';
import { DeliveryChallanModule } from './delivery-challan/delivery-challan.module';
import { BackupModule } from './backup/backup.module';
import { SettingsModule } from './settings/settings.module';
import { PartiesModule } from './parties/parties.module';
import { ItemsModule } from './items/items.module';
import { SalesModule } from './sales/sales.module';
import { SaleModule } from './sale/sale.module';
import { ReportsModule } from './reports/reports.module'; 
import { BarcodeModule } from './barcode/barcode.module';
import { InvoiceModule } from './invoice/invoice.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CreditNotesModule } from './credit-notes/credit-notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Make JwtModule global so it's available in all modules
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    // PrismaModule, // Commented out temporarily
    AuthModule,
    BusinessModule,
    CashBankModule,
    DeliveryChallanModule,
    BackupModule,
    SettingsModule,
    PartiesModule,
    ItemsModule,
    SalesModule,
    SaleModule, // New sale module for invoice creation
    ReportsModule,
    BarcodeModule,
    InvoiceModule,
    InvoicesModule,
    CreditNotesModule,
  ],
})
export class AppModule {}
