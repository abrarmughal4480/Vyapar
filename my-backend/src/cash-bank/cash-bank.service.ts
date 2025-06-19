import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto, TransferFundsDto, DateRangeDto } from './dto/cash-bank.dto';

export interface Account {
  id: number;
  businessId: string;
  name: string;
  type: 'Cash' | 'Bank';
  balance: number;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  description?: string;
  color: string; // Added to match DTO
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  businessId: string;
  accountId: number;
  account: string; // Added to match DTO
  type: 'Payment In' | 'Payment Out';
  party: string;
  amount: number;
  mode: string;
  date: string;
  referenceNumber?: string;
  description?: string;
  category?: string;
  tags?: string;
  attachmentUrl?: string;
  status: 'Completed' | 'Pending' | 'Failed';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CashBankService {
  private accounts: Account[] = [];
  private transactions: Transaction[] = [];
  private nextAccountId = 1;

  // Generate random color for accounts
  private generateAccountColor(): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  constructor() {
    // Initialize with some demo data
    this.initializeDemoData();
  }

  // Initialize demo data for testing
  private initializeDemoData() {
    console.log('Initializing demo data for Cash & Bank service...');
    // Create demo accounts for different businesses - use more common business IDs
    const demoBusinesses = ['demo-business-1', 'cmbhy3jsc0007upmgu6ahk0oz', 'test-business'];
    
    demoBusinesses.forEach(businessId => {
      console.log(`Creating demo data for business: ${businessId}`);
      this.accounts.push(
        {
          id: this.nextAccountId++,
          businessId,
          name: 'Cash Account',
          type: 'Cash',
          balance: 45000,
          accountNumber: 'CASH-001',
          color: '#10B981',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: this.nextAccountId++,
          businessId,
          name: 'HDFC Bank',
          type: 'Bank',
          balance: 125000,
          accountNumber: '****5678',
          bankName: 'HDFC Bank',
          color: '#3B82F6',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: this.nextAccountId++,
          businessId,
          name: 'SBI Current A/c',
          type: 'Bank',
          balance: 85000,
          accountNumber: '****9012',
          bankName: 'State Bank of India',
          color: '#8B5CF6',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Create demo transactions
      const accountIds = this.accounts.filter(acc => acc.businessId === businessId).map(acc => acc.id);
      
      this.transactions.push(
        {
          id: `TXN-${Date.now()}-001`,
          businessId,
          accountId: accountIds[0],
          account: 'Cash Account',
          type: 'Payment In',
          party: 'Customer ABC',
          amount: 15000,
          mode: 'Cash',
          date: new Date().toISOString().split('T')[0],
          status: 'Completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `TXN-${Date.now()}-002`,
          businessId,
          accountId: accountIds[1],
          account: 'HDFC Bank',
          type: 'Payment Out',
          party: 'Supplier XYZ',
          amount: 25000,
          mode: 'Bank Transfer',
          date: new Date().toISOString().split('T')[0],
          status: 'Completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    });
    console.log(`Demo data initialized. Total accounts: ${this.accounts.length}, Total transactions: ${this.transactions.length}`);
  }

  // Account methods
  async getAccounts(businessId: string): Promise<Account[]> {
    console.log(`Getting accounts for business: ${businessId}`);
    const accounts = this.accounts.filter(account => 
      account.businessId === businessId && account.isActive
    );
    console.log(`Found ${accounts.length} accounts for business ${businessId}`);
    return accounts;
  }

  async getAccountById(businessId: string, accountId: number): Promise<Account> {
    const account = this.accounts.find(account => 
      account.businessId === businessId && account.id === accountId && account.isActive
    );
    
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    
    return account;
  }

  async createAccount(businessId: string, createAccountDto: CreateAccountDto): Promise<Account> {
    const newAccount: Account = {
      id: this.nextAccountId++,
      businessId,
      name: createAccountDto.name,
      type: createAccountDto.type,
      balance: createAccountDto.openingBalance || 0,
      accountNumber: createAccountDto.accountNumber,
      bankName: createAccountDto.bankName,
      ifscCode: createAccountDto.ifscCode,
      branchName: createAccountDto.branchName,
      description: createAccountDto.description,
      color: this.generateAccountColor(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accounts.push(newAccount);
    return newAccount;
  }

  async updateAccount(businessId: string, accountId: number, updateAccountDto: UpdateAccountDto): Promise<Account> {
    const accountIndex = this.accounts.findIndex(account => 
      account.businessId === businessId && account.id === accountId && account.isActive
    );
    
    if (accountIndex === -1) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    this.accounts[accountIndex] = {
      ...this.accounts[accountIndex],
      ...updateAccountDto,
      updatedAt: new Date().toISOString(),
    };

    return this.accounts[accountIndex];
  }

  async deleteAccount(businessId: string, accountId: number): Promise<void> {
    const accountIndex = this.accounts.findIndex(account => 
      account.businessId === businessId && account.id === accountId && account.isActive
    );
    
    if (accountIndex === -1) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Soft delete
    this.accounts[accountIndex].isActive = false;
    this.accounts[accountIndex].updatedAt = new Date().toISOString();
  }

  // Transaction methods
  async getTransactions(businessId: string): Promise<Transaction[]> {
    return this.transactions.filter(transaction => 
      transaction.businessId === businessId
    );
  }

  async getTransactionById(businessId: string, transactionId: string): Promise<Transaction> {
    const transaction = this.transactions.find(transaction => 
      transaction.businessId === businessId && transaction.id === transactionId
    );
    
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }
    
    return transaction;
  }

  async createTransaction(businessId: string, createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const account = await this.getAccountById(businessId, createTransactionDto.accountId);
    
    const newTransaction: Transaction = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId,
      accountId: createTransactionDto.accountId,
      account: account.name, // Add account name
      type: createTransactionDto.type,
      party: createTransactionDto.party,
      amount: createTransactionDto.amount,
      mode: createTransactionDto.mode,
      date: createTransactionDto.date || new Date().toISOString().split('T')[0],
      referenceNumber: createTransactionDto.referenceNumber,
      description: createTransactionDto.description,
      category: createTransactionDto.category,
      tags: createTransactionDto.tags,
      attachmentUrl: createTransactionDto.attachmentUrl,
      status: createTransactionDto.status || 'Completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update account balance
    if (createTransactionDto.type === 'Payment In') {
      account.balance += createTransactionDto.amount;
    } else {
      account.balance -= createTransactionDto.amount;
    }
    account.updatedAt = new Date().toISOString();

    this.transactions.push(newTransaction);
    return newTransaction;
  }

  async updateTransaction(businessId: string, transactionId: string, updateData: Partial<CreateTransactionDto>): Promise<Transaction> {
    const transactionIndex = this.transactions.findIndex(transaction => 
      transaction.businessId === businessId && transaction.id === transactionId
    );
    
    if (transactionIndex === -1) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    this.transactions[transactionIndex] = {
      ...this.transactions[transactionIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return this.transactions[transactionIndex];
  }

  async deleteTransaction(businessId: string, transactionId: string): Promise<void> {
    const transactionIndex = this.transactions.findIndex(transaction => 
      transaction.businessId === businessId && transaction.id === transactionId
    );
    
    if (transactionIndex === -1) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    // Get transaction before deleting for balance reversion
    const transactionToDelete = this.transactions[transactionIndex];
    const account = await this.getAccountById(businessId, transactionToDelete.accountId);
    
    // Revert account balance
    if (transactionToDelete.type === 'Payment In') {
      account.balance -= transactionToDelete.amount;
    } else {
      account.balance += transactionToDelete.amount;
    }
    account.updatedAt = new Date().toISOString();

    this.transactions.splice(transactionIndex, 1);
  }

  // Transfer funds between accounts
  async transferFunds(businessId: string, fromAccountId: number, toAccountId: number, amount: number, description?: string): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const fromAccount = await this.getAccountById(businessId, fromAccountId);
    const toAccount = await this.getAccountById(businessId, toAccountId);

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient balance in source account');
    }

    // Create outgoing transaction
    const fromTransaction = await this.createTransaction(businessId, {
      accountId: fromAccountId,
      type: 'Payment Out',
      party: `Transfer to ${toAccount.name}`,
      amount,
      mode: 'Transfer',
      description: description || 'Account transfer',
    });

    // Create incoming transaction
    const toTransaction = await this.createTransaction(businessId, {
      accountId: toAccountId,
      type: 'Payment In',
      party: `Transfer from ${fromAccount.name}`,
      amount,
      mode: 'Transfer',
      description: description || 'Account transfer',
    });

    return { fromTransaction, toTransaction };
  }

  // Analytics methods
  async getAccountSummary(businessId: string): Promise<any> {
    const accounts = await this.getAccounts(businessId);
    
    const summary = {
      totalAccounts: accounts.length,
      totalBalance: accounts.reduce((total, account) => total + account.balance, 0),
      cashAccounts: accounts.filter(acc => acc.type === 'Cash').length,
      bankAccounts: accounts.filter(acc => acc.type === 'Bank').length,
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance
      }))
    };

    return summary;
  }

  async getTransactionSummary(businessId: string, dateFrom?: string, dateTo?: string): Promise<any> {
    let transactions = this.transactions.filter(transaction => 
      transaction.businessId === businessId
    );

    if (dateFrom) {
      transactions = transactions.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      transactions = transactions.filter(t => t.date <= dateTo);
    }

    const paymentIn = transactions.filter(t => t.type === 'Payment In');
    const paymentOut = transactions.filter(t => t.type === 'Payment Out');

    return {
      totalTransactions: transactions.length,
      totalPaymentIn: paymentIn.reduce((total, t) => total + t.amount, 0),
      totalPaymentOut: paymentOut.reduce((total, t) => total + t.amount, 0),
      netFlow: paymentIn.reduce((total, t) => total + t.amount, 0) - paymentOut.reduce((total, t) => total + t.amount, 0),
      paymentInCount: paymentIn.length,
      paymentOutCount: paymentOut.length,
      transactions: transactions.slice(0, 10) // Recent 10 transactions
    };
  }

  // Initialize default accounts for new business
  async initializeDefaultAccount(businessId: string): Promise<Account> {
    const existingAccount = this.accounts.find(account => 
      account.businessId === businessId && account.isActive
    );

    if (existingAccount) {
      return existingAccount;
    }

    return this.createAccount(businessId, {
      name: 'Cash Account',
      type: 'Cash',
      description: 'Default cash account',
      openingBalance: 0
    });
  }
}
