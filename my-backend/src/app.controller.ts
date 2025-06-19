import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Vypar Backend API',
      version: '1.0.0',
      message: '✅ Backend is running successfully!',
      authentication: {
        status: 'enabled',
        defaultAccounts: [
          {
            email: 'admin@vypar.com',
            password: 'password123',
            role: 'admin',
            businessId: 'business-1',
            ready: true,
          },
          {
            email: 'test@vypar.com',
            password: 'password123',
            role: 'user',
            businessId: 'business-2',
            ready: true,
          },
        ],
      },
      endpoints: {
        auth: {
          login: 'POST /auth/login',
          signup: 'POST /auth/signup',
          verifyToken: 'POST /auth/verify-token',
          debugUsers: 'GET /auth/debug/users',
          testLogin: 'GET /auth/debug/test-login',
        },
        cashBank: {
          accounts: 'GET /cash-bank/accounts/:businessId',
          createAccount: 'POST /cash-bank/accounts/:businessId',
          transactions: 'GET /cash-bank/transactions/:businessId',
          createTransaction: 'POST /cash-bank/transactions/:businessId',
        },
        sale: {
          createInvoice: 'POST /sale/:businessId/invoice',
          getInvoices: 'GET /sale/:businessId',
          getInvoice: 'GET /sale/:businessId/invoice/:invoiceId',
          updateInvoice: 'PUT /sale/:businessId/invoice/:invoiceId',
          deleteInvoice: 'DELETE /sale/:businessId/invoice/:invoiceId',
          getStats: 'GET /sale/:businessId/stats',
        },
      },
      instructions: [
        '1. Use admin@vypar.com / password123 for admin access',
        '2. Use test@vypar.com / password123 for user access',
        '3. Test login endpoint: GET /auth/debug/test-login',
        '4. View all users: GET /auth/debug/users',
        '5. Create invoice: POST /sale/:businessId/invoice',
      ],
    };
  }
}