import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  type: string;

  @IsString()
  party: string;

  @IsNumber()
  amount: number;

  @IsString()
  mode: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  businessId: string;
}
