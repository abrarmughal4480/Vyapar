import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEmail, IsPhoneNumber, IsNumber, IsEnum } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

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
  country?: string;

  @IsOptional()
  @IsString()
  businessLogo?: string;

  @IsOptional()
  businessHours?: any;
}

export class CreateSettingsDto {
  @IsNotEmpty()
  @IsString()
  businessId: string;

  // All settings as optional since they have defaults
  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @IsOptional()
  @IsString()
  backupFrequency?: string;

  @IsOptional()
  @IsBoolean()
  lowStockAlert?: boolean;

  @IsOptional()
  @IsNumber()
  stockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  autoInvoiceNumber?: boolean;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsNumber()
  invoiceStartNumber?: number;

  @IsOptional()
  @IsBoolean()
  showDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  showTax?: boolean;

  @IsOptional()
  @IsString()
  defaultPaymentTerms?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  invoiceReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;

  @IsOptional()
  @IsString()
  sessionTimeout?: string;

  @IsOptional()
  @IsString()
  passwordExpiry?: string;

  @IsOptional()
  @IsString()
  printerName?: string;

  @IsOptional()
  @IsString()
  paperSize?: string;

  @IsOptional()
  @IsString()
  margins?: string;

  @IsOptional()
  @IsBoolean()
  showCompanyLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showWatermark?: boolean;

  @IsOptional()
  @IsBoolean()
  gstFiling?: boolean;

  @IsOptional()
  @IsBoolean()
  eWayBill?: boolean;

  @IsOptional()
  @IsBoolean()
  bankSync?: boolean;

  @IsOptional()
  @IsString()
  paymentGateway?: string;

  @IsOptional()
  @IsBoolean()
  multiCurrency?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsBoolean()
  cloudBackup?: boolean;

  @IsOptional()
  @IsBoolean()
  dataEncryption?: boolean;

  @IsOptional()
  @IsBoolean()
  auditLog?: boolean;

  @IsOptional()
  @IsBoolean()
  customFields?: boolean;

  @IsOptional()
  @IsBoolean()
  advancedReporting?: boolean;

  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  webhooks?: boolean;

  @IsOptional()
  @IsBoolean()
  bulkOperations?: boolean;

  @IsOptional()
  @IsBoolean()
  scheduledReports?: boolean;

  @IsOptional()
  @IsBoolean()
  cacheEnabled?: boolean;

  @IsOptional()
  @IsString()
  compressionLevel?: string;

  @IsOptional()
  @IsString()
  maxFileSize?: string;

  @IsOptional()
  @IsString()
  sessionStorage?: string;

  @IsOptional()
  @IsBoolean()
  gdprCompliance?: boolean;

  @IsOptional()
  @IsString()
  dataRetention?: string;

  @IsOptional()
  @IsBoolean()
  consentTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  rightsManagement?: boolean;
}

export class UpdateSettingsDto {
  // All settings as optional for updates
  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @IsOptional()
  @IsString()
  backupFrequency?: string;

  @IsOptional()
  @IsBoolean()
  lowStockAlert?: boolean;

  @IsOptional()
  @IsNumber()
  stockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  autoInvoiceNumber?: boolean;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsNumber()
  invoiceStartNumber?: number;

  @IsOptional()
  @IsBoolean()
  showDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  showTax?: boolean;

  @IsOptional()
  @IsString()
  defaultPaymentTerms?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  invoiceReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsBoolean()
  twoFactorAuth?: boolean;

  @IsOptional()
  @IsString()
  sessionTimeout?: string;

  @IsOptional()
  @IsString()
  passwordExpiry?: string;

  @IsOptional()
  @IsString()
  printerName?: string;

  @IsOptional()
  @IsString()
  paperSize?: string;

  @IsOptional()
  @IsString()
  margins?: string;

  @IsOptional()
  @IsBoolean()
  showCompanyLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showWatermark?: boolean;

  @IsOptional()
  @IsBoolean()
  gstFiling?: boolean;

  @IsOptional()
  @IsBoolean()
  eWayBill?: boolean;

  @IsOptional()
  @IsBoolean()
  bankSync?: boolean;

  @IsOptional()
  @IsString()
  paymentGateway?: string;

  @IsOptional()
  @IsBoolean()
  multiCurrency?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsBoolean()
  cloudBackup?: boolean;

  @IsOptional()
  @IsBoolean()
  dataEncryption?: boolean;

  @IsOptional()
  @IsBoolean()
  auditLog?: boolean;

  @IsOptional()
  @IsBoolean()
  customFields?: boolean;

  @IsOptional()
  @IsBoolean()
  advancedReporting?: boolean;

  @IsOptional()
  @IsBoolean()
  apiAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  webhooks?: boolean;

  @IsOptional()
  @IsBoolean()
  bulkOperations?: boolean;

  @IsOptional()
  @IsBoolean()
  scheduledReports?: boolean;

  @IsOptional()
  @IsBoolean()
  cacheEnabled?: boolean;

  @IsOptional()
  @IsString()
  compressionLevel?: string;

  @IsOptional()
  @IsString()
  maxFileSize?: string;

  @IsOptional()
  @IsString()
  sessionStorage?: string;

  @IsOptional()
  @IsBoolean()
  gdprCompliance?: boolean;

  @IsOptional()
  @IsString()
  dataRetention?: string;

  @IsOptional()
  @IsBoolean()
  consentTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  rightsManagement?: boolean;
}
