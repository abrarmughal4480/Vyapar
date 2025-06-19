import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsPositive, Min, IsEnum, IsDateString } from 'class-validator';

export class CreateItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  subcategory: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  salePrice: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsNotEmpty()
  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsEnum(['Active', 'Inactive', 'Discontinued'])
  status?: 'Active' | 'Inactive' | 'Discontinued';

  @IsOptional()
  @IsEnum(['Product', 'Service'])
  type?: 'Product' | 'Service';

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // Stock related fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  atPrice?: number;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsEnum(['Active', 'Inactive', 'Discontinued'])
  status?: 'Active' | 'Inactive' | 'Discontinued';

  @IsOptional()
  @IsEnum(['Product', 'Service'])
  type?: 'Product' | 'Service';

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  atPrice?: number;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
