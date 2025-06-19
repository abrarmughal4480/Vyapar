import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  name: string;

  @IsNumber()
  qty: number;

  @IsNumber()
  rate: number;

  @IsNumber()
  amount: number;
}

export class CreateInvoiceDto {
  @IsString()
  invoiceNumber: string;

  @IsString()
  invoiceDate: string;

  @IsString()
  customerName: string;

  @IsNumber()
  invoiceAmount: number;

  @IsNumber()
  received: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSaleDto {
  @IsString()
  customer: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  items?: string | InvoiceItemDto[];

  @IsString()
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
}

export class UpdateSaleDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  items?: InvoiceItemDto[] | string;

  @IsOptional()
  @IsString()
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
}
