import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, IsEnum, ValidateNested, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesOrderItemDto {
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
}

export class CreateSalesOrderDto {
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];

  @IsOptional()
  @IsEnum(['Draft', 'Created', 'Completed', 'Cancelled'])
  status?: 'Draft' | 'Created' | 'Completed' | 'Cancelled';

  @IsOptional()
  @IsString()
  date?: string;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items?: SalesOrderItemDto[];

  @IsOptional()
  @IsEnum(['Draft', 'Created', 'Completed', 'Cancelled'])
  status?: 'Draft' | 'Created' | 'Completed' | 'Cancelled';

  @IsOptional()
  @IsString()
  date?: string;
}
