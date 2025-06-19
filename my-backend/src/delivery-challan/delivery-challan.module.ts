import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryChallanController } from './delivery-challan.controller';
import { DeliveryChallanService } from './delivery-challan.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [DeliveryChallanController],
  providers: [DeliveryChallanService],
  exports: [DeliveryChallanService],
})
export class DeliveryChallanModule {}
