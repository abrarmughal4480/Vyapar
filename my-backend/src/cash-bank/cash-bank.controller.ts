import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Query, Request } from '@nestjs/common';
import { CashBankService, Account, Transaction } from './cash-bank.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  CreateAccountDto, 
  CreateTransactionDto, 
  UpdateAccountDto, 
  TransferFundsDto, 
  DateRangeDto
} from './dto/cash-bank.dto';

@Controller('cash-bank')
export class CashBankController {
  constructor(private readonly cashBankService: CashBankService) {}

  // Account endpoints
  @Get('accounts/:businessId')
  async getAccounts(
    @Param('businessId') businessId: string,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Account[]; message: string }> {
    try {
      console.log('Cash-Bank: Getting accounts for business:', businessId);
      console.log('Cash-Bank: User from request:', req?.user?.email || 'No user info');
      
      const accounts = await this.cashBankService.getAccounts(businessId);
      console.log('Cash-Bank: Found accounts:', accounts.length);
      
      return {
        success: true,
        data: accounts,
        message: 'Accounts fetched successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error fetching accounts:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch accounts'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('accounts/:businessId/:accountId')
  async getAccount(
    @Param('businessId') businessId: string, 
    @Param('accountId') accountId: string,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Account; message: string }> {
    try {
      console.log('Cash-Bank: Getting account:', accountId, 'for business:', businessId);
      
      const account = await this.cashBankService.getAccountById(businessId, parseInt(accountId));
      return {
        success: true,
        data: account,
        message: 'Account fetched successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error fetching account:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Account not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post('accounts/:businessId')
  async createAccount(
    @Param('businessId') businessId: string, 
    @Body() createAccountDto: CreateAccountDto,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Account; message: string }> {
    try {
      console.log('Cash-Bank: Creating account for business:', businessId);
      console.log('Cash-Bank: Account data:', createAccountDto);
      console.log('Cash-Bank: User from request:', req?.user?.email || 'No user info');
      
      const account = await this.cashBankService.createAccount(businessId, createAccountDto);
      
      console.log('Cash-Bank: Account created successfully:', account.id);
      
      return {
        success: true,
        data: account,
        message: 'Account created successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error creating account:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create account'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('accounts/:businessId/:accountId')
  async updateAccount(
    @Param('businessId') businessId: string,
    @Param('accountId') accountId: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Account; message: string }> {
    try {
      console.log('Cash-Bank: Updating account:', accountId, 'for business:', businessId);
      
      const account = await this.cashBankService.updateAccount(businessId, parseInt(accountId), updateAccountDto);
      return {
        success: true,
        data: account,
        message: 'Account updated successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error updating account:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update account'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('accounts/:businessId/:accountId')
  async deleteAccount(
    @Param('businessId') businessId: string, 
    @Param('accountId') accountId: string,
    @Request() req?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Cash-Bank: Deleting account:', accountId, 'for business:', businessId);
      
      await this.cashBankService.deleteAccount(businessId, parseInt(accountId));
      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error deleting account:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete account'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Transaction endpoints
  @Get('transactions/:businessId')
  async getTransactions(
    @Param('businessId') businessId: string,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Transaction[]; message: string }> {
    try {
      console.log('Cash-Bank: Getting transactions for business:', businessId);
      
      const transactions = await this.cashBankService.getTransactions(businessId);
      return {
        success: true,
        data: transactions,
        message: 'Transactions fetched successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error fetching transactions:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch transactions'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('transactions/:businessId')
  async createTransaction(
    @Param('businessId') businessId: string, 
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req?: any
  ): Promise<{ success: boolean; data: Transaction; message: string }> {
    try {
      console.log('Cash-Bank: Creating transaction for business:', businessId);
      console.log('Cash-Bank: Transaction data:', createTransactionDto);
      
      const transaction = await this.cashBankService.createTransaction(businessId, createTransactionDto);
      return {
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error creating transaction:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create transaction'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('transactions/:businessId/:transactionId')
  async getTransaction(@Param('businessId') businessId: string, @Param('transactionId') transactionId: string): Promise<{ success: boolean; data: Transaction; message: string }> {
    try {
      const transaction = await this.cashBankService.getTransactionById(businessId, transactionId);
      return {
        success: true,
        data: transaction,
        message: 'Transaction fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Transaction not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Put('transactions/:businessId/:transactionId')
  async updateTransaction(
    @Param('businessId') businessId: string,
    @Param('transactionId') transactionId: string,
    @Body() updateData: Partial<CreateTransactionDto>
  ): Promise<{ success: boolean; data: Transaction; message: string }> {
    try {
      const transaction = await this.cashBankService.updateTransaction(businessId, transactionId, updateData);
      return {
        success: true,
        data: transaction,
        message: 'Transaction updated successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update transaction'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('transactions/:businessId/:transactionId')
  async deleteTransaction(@Param('businessId') businessId: string, @Param('transactionId') transactionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.cashBankService.deleteTransaction(businessId, transactionId);
      return {
        success: true,
        message: 'Transaction deleted successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete transaction'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Transfer endpoint
  @Post('transfer/:businessId')
  async transferFunds(@Param('businessId') businessId: string, @Body() transferDto: TransferFundsDto): Promise<{ success: boolean; data: { fromTransaction: Transaction; toTransaction: Transaction }; message: string }> {
    try {
      const result = await this.cashBankService.transferFunds(
        businessId,
        transferDto.fromAccountId,
        transferDto.toAccountId,
        transferDto.amount,
        transferDto.description
      );
      return {
        success: true,
        data: result,
        message: 'Transfer completed successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Transfer failed'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Analytics endpoints
  @Get('summary/accounts/:businessId')
  async getAccountSummary(
    @Param('businessId') businessId: string,
    @Request() req?: any
  ) {
    try {
      console.log('Cash-Bank: Getting account summary for business:', businessId);
      
      const summary = await this.cashBankService.getAccountSummary(businessId);
      return {
        success: true,
        data: summary,
        message: 'Account summary fetched successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error fetching account summary:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch account summary'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('summary/transactions/:businessId')
  async getTransactionSummary(
    @Param('businessId') businessId: string,
    @Query() dateRange: DateRangeDto,
    @Request() req?: any
  ) {
    try {
      console.log('Cash-Bank: Getting transaction summary for business:', businessId);
      
      const summary = await this.cashBankService.getTransactionSummary(
        businessId,
        dateRange.dateFrom,
        dateRange.dateTo
      );
      return {
        success: true,
        data: summary,
        message: 'Transaction summary fetched successfully'
      };
    } catch (error: any) {
      console.error('Cash-Bank: Error fetching transaction summary:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch transaction summary'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Public endpoints for testing (remove @UseGuards for these)
  @Get('test/health')
  async testHealth(): Promise<{ success: boolean; message: string }> {
    console.log('Cash-Bank: Health check called');
    return {
      success: true,
      message: 'Cash & Bank service is running'
    };
  }
}
