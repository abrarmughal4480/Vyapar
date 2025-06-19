import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsPositive, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChallanItemDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateDeliveryChallanDto {
  @IsNotEmpty()
  @IsString()
  challanNo: string;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  customerName: string;

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
  @Type(() => ChallanItemDto)
  items: ChallanItemDto[];

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Dispatched', 'Delivered', 'Returned'])
  status?: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeliveryChallanDto {
  @IsOptional()
  @IsString()
  challanNo?: string;

  @IsOptional()
  @IsString()
  date?: string;

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
  @IsString()
  customerGST?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChallanItemDto)
  items?: ChallanItemDto[];

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsEnum(['Draft', 'Dispatched', 'Delivered', 'Returned'])
  status?: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FilterDeliveryChallanDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;
}
