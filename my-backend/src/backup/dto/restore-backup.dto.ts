import { IsObject, IsOptional, IsBoolean } from 'class-validator';

export class RestoreBackupDto {
  @IsObject()
  data: {
    version: string;
    timestamp: string;
    customers: any[];
    products: any[];
    invoices: any[];
    quotations: any[];
    purchases: any[];
    settings: any;
  };

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}
