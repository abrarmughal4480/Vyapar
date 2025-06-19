import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

class ItemDto {
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

  @IsNumber()
  balance: number;

  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  items: ItemDto[];
}
