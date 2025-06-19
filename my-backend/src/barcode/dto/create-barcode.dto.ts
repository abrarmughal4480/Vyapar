import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum BarcodeFormat {
  CODE128 = 'CODE128',
  CODE39 = 'CODE39',
  EAN13 = 'EAN13',
  EAN8 = 'EAN8',
  UPC = 'UPC',
  QR = 'QR'
}

export class CreateBarcodeDto {
  @IsString()
  productName: string;

  @IsString()
  skuCode: string;

  @IsEnum(BarcodeFormat)
  @IsOptional()
  barcodeFormat?: BarcodeFormat;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

export class BulkGenerateBarcodeDto {
  @IsString({ each: true })
  codes: string[];
}
