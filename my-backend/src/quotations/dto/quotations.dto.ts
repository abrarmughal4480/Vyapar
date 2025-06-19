import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, IsEnum, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;
}

export class CreateQuotationDto {
  @IsNotEmpty()
  @IsString()
  customer: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['Sent', 'Accepted', 'Pending', 'Rejected'])
  status?: 'Sent' | 'Accepted' | 'Pending' | 'Rejected';

  @IsOptional()
  @IsString()
  date?: string;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['Sent', 'Accepted', 'Pending', 'Rejected'])
  status?: 'Sent' | 'Accepted' | 'Pending' | 'Rejected';

  @IsOptional()
  @IsString()
  date?: string;
}
