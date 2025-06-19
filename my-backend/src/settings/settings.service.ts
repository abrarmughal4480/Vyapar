import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSettingsDto, UpdateSettingsDto, UpdateUserProfileDto } from './dto/settings.dto';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  businessLogo?: string;
  businessHours?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  businessId: string;
  // Business Settings
  autoBackup: boolean;
  backupFrequency: string;
  lowStockAlert: boolean;
  stockThreshold: number;
  
  // Invoice Settings
  autoInvoiceNumber: boolean;
  invoicePrefix: string;
  invoiceStartNumber: number;
  showDiscount: boolean;
  showTax: boolean;
  defaultPaymentTerms: string;
  
  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  invoiceReminders: boolean;
  paymentReminders: boolean;
  
  // Display Settings
  currency: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  theme: string;
  
  // Security Settings
  twoFactorAuth: boolean;
  sessionTimeout: string;
  passwordExpiry: string;
  
  // Printing Settings
  printerName: string;
  paperSize: string;
  margins: string;
  showCompanyLogo: boolean;
  showWatermark: boolean;
  
  // Integration Settings
  gstFiling: boolean;
  eWayBill: boolean;
  bankSync: boolean;
  paymentGateway: string;
  
  // Advanced Features
  multiCurrency: boolean;
  autoSync: boolean;
  cloudBackup: boolean;
  dataEncryption: boolean;
  auditLog: boolean;
  customFields: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  bulkOperations: boolean;
  scheduledReports: boolean;
  
  // Performance Settings
  cacheEnabled: boolean;
  compressionLevel: string;
  maxFileSize: string;
  sessionStorage: string;
  
  // Compliance Settings
  gdprCompliance: boolean;
  dataRetention: string;
  consentTracking: boolean;
  rightsManagement: boolean;
  
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SettingsService {
  private users: Map<string, UserProfile> = new Map();
  private settings: Map<string, AppSettings> = new Map();
  private nextUserId = 1;
  private nextSettingsId = 1;

  constructor() {
    console.log('🔧 Initializing Settings service for real API...');
    // Remove demo data initialization - work with real business IDs only
  }

  async getUserProfile(businessId: string): Promise<UserProfile> {
    console.log('Getting user profile for business:', businessId);
    
    let user = this.users.get(businessId);
    
    if (!user) {
      console.log('User profile not found, creating default for business:', businessId);
      user = this.createDefaultUser(businessId);
      this.users.set(businessId, user);
    }
    
    return user;
  }

  async updateUserProfile(businessId: string, updateData: UpdateUserProfileDto): Promise<UserProfile> {
    console.log('Updating user profile for business:', businessId, updateData);
    
    let user = this.users.get(businessId);
    
    if (!user) {
      user = this.createDefaultUser(businessId);
    }

    const updatedUser: UserProfile = {
      ...user,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(businessId, updatedUser);
    console.log('User profile updated successfully for business:', businessId);
    return updatedUser;
  }

  async getSettings(businessId: string): Promise<AppSettings> {
    console.log('Getting settings for business:', businessId);
    
    let settings = this.settings.get(businessId);
    
    if (!settings) {
      console.log('Settings not found, creating default for business:', businessId);
      settings = this.createDefaultSettings(businessId);
      this.settings.set(businessId, settings);
    }
    
    return settings;
  }

  async updateSettings(businessId: string, updateData: UpdateSettingsDto): Promise<AppSettings> {
    console.log('Updating settings for business:', businessId);
    
    let settings = this.settings.get(businessId);
    
    if (!settings) {
      settings = this.createDefaultSettings(businessId);
    }

    const updatedSettings: AppSettings = {
      ...settings,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    this.settings.set(businessId, updatedSettings);
    console.log('Settings updated successfully for business:', businessId);
    return updatedSettings;
  }

  async exportUserData(businessId: string): Promise<any> {
    console.log('Exporting data for business:', businessId);
    
    const user = await this.getUserProfile(businessId);
    const settings = await this.getSettings(businessId);
    
    return {
      user,
      settings,
      businessId,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  async importUserData(businessId: string, data: any): Promise<{ success: boolean; message: string }> {
    console.log('Importing data for business:', businessId);
    
    try {
      if (data.user) {
        await this.updateUserProfile(businessId, data.user);
      }
      
      if (data.settings) {
        await this.updateSettings(businessId, data.settings);
      }
      
      console.log('Data imported successfully for business:', businessId);
      return {
        success: true,
        message: 'Data imported successfully'
      };
    } catch (error) {
      console.error('Import failed for business:', businessId, error);
      throw new BadRequestException('Failed to import data: Invalid format');
    }
  }

  async resetSettings(businessId: string): Promise<AppSettings> {
    console.log('Resetting settings for business:', businessId);
    
    const defaultSettings = this.createDefaultSettings(businessId);
    this.settings.set(businessId, defaultSettings);
    
    console.log('Settings reset successfully for business:', businessId);
    return defaultSettings;
  }

  private createDefaultUser(businessId: string): UserProfile {
    console.log('Creating default user profile for business:', businessId);
    
    const user: UserProfile = {
      id: businessId,
      name: 'Business Owner',
      email: 'owner@company.com',
      phone: '+91 98765 43210',
      businessName: 'My Business',
      businessType: 'Retail',
      gstNumber: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return user;
  }

  private createDefaultSettings(businessId: string): AppSettings {
    console.log('Creating default settings for business:', businessId);
    
    return {
      id: (this.nextSettingsId++).toString(),
      businessId,
      // Default values for all settings
      autoBackup: true,
      backupFrequency: 'daily',
      lowStockAlert: true,
      stockThreshold: 10,
      autoInvoiceNumber: true,
      invoicePrefix: 'INV',
      invoiceStartNumber: 1,
      showDiscount: true,
      showTax: true,
      defaultPaymentTerms: '30',
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      invoiceReminders: true,
      paymentReminders: true,
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12',
      language: 'en',
      theme: 'light',
      twoFactorAuth: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
      printerName: 'Default',
      paperSize: 'A4',
      margins: 'normal',
      showCompanyLogo: true,
      showWatermark: false,
      gstFiling: false,
      eWayBill: false,
      bankSync: false,
      paymentGateway: 'none',
      multiCurrency: false,
      autoSync: true,
      cloudBackup: true,
      dataEncryption: true,
      auditLog: true,
      customFields: false,
      advancedReporting: false,
      apiAccess: false,
      webhooks: false,
      bulkOperations: true,
      scheduledReports: false,
      cacheEnabled: true,
      compressionLevel: 'medium',
      maxFileSize: '10',
      sessionStorage: 'local',
      gdprCompliance: true,
      dataRetention: '7years',
      consentTracking: true,
      rightsManagement: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Clear data for a specific business (for testing)
  async clearBusinessData(businessId: string): Promise<void> {
    console.log('Clearing data for business:', businessId);
    this.users.delete(businessId);
    this.settings.delete(businessId);
  }

  // Get all business IDs (for admin/debug purposes)
  async getAllBusinessIds(): Promise<string[]> {
    const allBusinessIds = Array.from(new Set([
      ...this.users.keys(),
      ...this.settings.keys()
    ]));
    console.log('All business IDs:', allBusinessIds);
    return allBusinessIds;
  }
}

