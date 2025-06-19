import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  type: string; // "Payment In" or "Payment Out"

  @IsString()
  party: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  mode: string; // Cash, Bank Transfer, UPI, etc.

  @IsString()
  account: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  businessId: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  party?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
