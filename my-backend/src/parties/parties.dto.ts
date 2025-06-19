import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsNotEmpty, IsEmail } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum PartyType {
  CUSTOMER = 'Customer',
  SUPPLIER = 'Supplier',
  BOTH = 'Both',
}

export class CreatePartyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(PartyType)
  @IsNotEmpty()
  type: PartyType;

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
  @Type(() => Number)
  balance?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean;
}

export class UpdatePartyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(PartyType)
  type?: PartyType;

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
  @Type(() => Number)
  balance?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  isActive?: boolean;
}
