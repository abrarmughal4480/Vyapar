import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    console.log('🚀 Starting NestJS server...');
    console.log('📦 Modules loaded:');
    console.log('  - AuthModule');
    console.log('  - BusinessModule');
    console.log('  - CashBankModule');
    console.log('  - DeliveryChallanModule');
    console.log('  - BackupModule');
    console.log('  - SettingsModule');
    console.log('  - ItemsModule');
    console.log('  - SalesModule');
    console.log('  - SaleModule (Invoice Creation)');
    console.log('  - ReportsModule');
    console.log('  - BarcodeModule');
    console.log('  - PrismaModule');

    const port = process.env.PORT || 3001;
    await app.listen(port);
    
    console.log(`🎯 Application is running on: http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  - GET  /health (Health Check)');
    console.log('  - POST /auth/login (Authentication)');
    console.log('  - POST /auth/signup (User Registration)');
    console.log('  - POST /sale/:businessId/invoice (Create Invoice)');
    console.log('  - GET  /sale/:businessId (Get All Invoices)');
    console.log('  - GET  /sale/:businessId/invoice/:invoiceId (Get Invoice)');
    console.log('  - GET  /sale/:businessId/stats (Sales Statistics)');
    console.log('  - GET  /delivery-challan/:businessId');
    console.log('  - POST /delivery-challan/:businessId');
    console.log('  - GET  /cash-bank/accounts/:businessId');
    console.log('  - POST /cash-bank/transactions/:businessId');
    
  } catch (error) {
    console.error('❌ Failed to create NestJS application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});