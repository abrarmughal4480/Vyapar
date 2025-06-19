import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsPositive } from 'class-validator';

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
