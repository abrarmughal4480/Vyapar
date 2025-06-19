import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCreditNoteItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  tax: number;
}

export class CreateCreditNoteDto {
  @IsNotEmpty()
  @IsString()
  noteNumber: string;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  customer: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerGST?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreditNoteItemDto)
  items: CreateCreditNoteItemDto[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Issued', 'Applied'])
  status?: 'Draft' | 'Issued' | 'Applied';
}

export class UpdateCreditNoteDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerGST?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Issued', 'Applied'])
  status?: 'Draft' | 'Issued' | 'Applied';
}

export class DateRangeDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

// Export interfaces for type safety
export interface CreditNoteItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  tax: number;
}

export interface CreditNote {
  id: string;
  noteNumber: string;
  date: string;
  customer: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGST?: string;
  items: CreditNoteItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  reason: string;
  notes?: string;
  status: 'Draft' | 'Issued' | 'Applied';
  businessId: string;
  createdAt: string;
  updatedAt: string;
}
