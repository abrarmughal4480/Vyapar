import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  @IsNotEmpty()
  items: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['Purchase Bill', 'Cash Purchase', 'Purchase Return', 'Purchase Order'])
  type?: 'Purchase Bill' | 'Cash Purchase' | 'Purchase Return' | 'Purchase Order';
}

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  amount?: number;

  @IsOptional()
  @IsString()
  items?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: 'pending' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
