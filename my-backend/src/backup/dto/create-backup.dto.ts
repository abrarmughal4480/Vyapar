import { IsString, IsObject } from 'class-validator';

export class CreateBackupDto {
  @IsString()
  type: 'full' | 'customers' | 'products';

  @IsObject()
  includeData: {
    customers: boolean;
    products: boolean;
    invoices: boolean;
    quotations: boolean;
    purchases: boolean;
    settings: boolean;
  };
}
