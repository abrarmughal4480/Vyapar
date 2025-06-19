import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, IsEnum, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreditNoteItemDto {
  @IsOptional()
  @IsString()
  id?: string;

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
  @IsPositive()
  tax: number;
}

export class CreateCreditNoteDto {
  @IsOptional()
  @IsString()
  noteNumber?: string;

  @IsOptional()
  @IsString()
  date?: string;

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

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items: CreditNoteItemDto[];

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
  noteNumber?: string;

  @IsOptional()
  @IsString()
  date?: string;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items?: CreditNoteItemDto[];

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
