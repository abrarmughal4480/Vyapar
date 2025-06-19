import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsEmail, IsArray } from 'class-validator';

export class CreatePartyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsEnum(['Customer', 'Supplier', 'Both'])
  type: 'Customer' | 'Supplier' | 'Both';

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdatePartyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['Customer', 'Supplier', 'Both'])
  type?: 'Customer' | 'Supplier' | 'Both';

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkImportDto {
  @IsNotEmpty()
  @IsArray()
  parties: CreatePartyDto[];

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;
}

export class ImportPartiesDto {
  @IsNotEmpty()
  file: any; // Will be handled by multer
}

export class ExportPartiesDto {
  @IsOptional()
  @IsEnum(['csv', 'excel'])
  format?: 'csv' | 'excel';

  @IsOptional()
  @IsEnum(['Customer', 'Supplier', 'Both'])
  type?: 'Customer' | 'Supplier' | 'Both';

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}

