import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsPositive, Min } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(['Cash', 'Bank'])
  type: 'Cash' | 'Bank';

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branchName?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['Cash', 'Bank'])
  type?: 'Cash' | 'Bank';

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branchName?: string;
}

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsEnum(['Payment In', 'Payment Out'])
  type: 'Payment In' | 'Payment Out';

  @IsNotEmpty()
  @IsString()
  party: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  mode: string;

  @IsNotEmpty()
  @IsNumber()
  accountId: number;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsEnum(['Completed', 'Pending', 'Failed'])
  status?: 'Completed' | 'Pending' | 'Failed';
}

export class TransferFundsDto {
  @IsNotEmpty()
  @IsNumber()
  fromAccountId: number;

  @IsNotEmpty()
  @IsNumber()
  toAccountId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class DateRangeDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
