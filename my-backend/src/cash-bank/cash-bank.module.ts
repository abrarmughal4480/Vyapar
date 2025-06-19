import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { CashBankController } from './cash-bank.controller';
import { CashBankService } from './cash-bank.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [CashBankController],
  providers: [CashBankService],
  exports: [CashBankService],
})
export class CashBankModule {
  constructor() {
    console.log('Cash & Bank Module initialized');
  }
}
export class SalesModule {
  constructor() {
    console.log('Sadles Module initialized');
  }
}