import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  HttpStatus, 
  HttpException, 
  UploadedFile, 
  UseInterceptors, 
  Request 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService, UserProfile, AppSettings } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserProfileDto, UpdateSettingsDto } from './dto/settings.dto';

// Add proper type for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

// Add proper request type
interface AuthenticatedRequest {
  user?: {
    id: string;
    email: string;
    businessId?: string;
  };
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile/:businessId')
  async getUserProfile(
    @Param('businessId') businessId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: UserProfile; message: string }> {
    try {
      console.log('Settings: Getting user profile for business:', businessId);
      console.log('Settings: User from JWT:', req.user?.email || 'Unknown');
      
      const profile = await this.settingsService.getUserProfile(businessId);
      return {
        success: true,
        data: profile,
        message: 'User profile fetched successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error fetching user profile:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch user profile'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('profile/:businessId')
  async updateUserProfile(
    @Param('businessId') businessId: string,
    @Body() updateData: UpdateUserProfileDto,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: UserProfile; message: string }> {
    try {
      console.log('Settings: Updating user profile for business:', businessId);
      console.log('Settings: Update data:', updateData);
      
      const profile = await this.settingsService.updateUserProfile(businessId, updateData);
      return {
        success: true,
        data: profile,
        message: 'User profile updated successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error updating user profile:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update user profile'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get(':businessId')
  async getSettings(
    @Param('businessId') businessId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: AppSettings; message: string }> {
    try {
      console.log('Settings: Getting settings for business:', businessId);
      console.log('Settings: User from JWT:', req.user?.email || 'Unknown');
      
      const settings = await this.settingsService.getSettings(businessId);
      return {
        success: true,
        data: settings,
        message: 'Settings fetched successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error fetching settings:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch settings'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':businessId')
  async updateSettings(
    @Param('businessId') businessId: string,
    @Body() updateData: UpdateSettingsDto,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: AppSettings; message: string }> {
    try {
      console.log('Settings: Updating settings for business:', businessId);
      console.log('Settings: Update data keys:', Object.keys(updateData));
      
      const settings = await this.settingsService.updateSettings(businessId, updateData);
      return {
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error updating settings:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update settings'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('export/:businessId')
  async exportData(
    @Param('businessId') businessId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Settings: Exporting data for business:', businessId);
      
      const data = await this.settingsService.exportUserData(businessId);
      return {
        success: true,
        data,
        message: 'Data exported successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error exporting data:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to export data'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('import/:businessId')
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @Param('businessId') businessId: string,
    @UploadedFile() file?: MulterFile,
    @Body() data?: any,
    @Request() req?: AuthenticatedRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Settings: Importing data for business:', businessId);
      
      let importData = data;
      
      if (file) {
        try {
          const fileContent = file.buffer.toString('utf8');
          importData = JSON.parse(fileContent);
        } catch (parseError) {
          throw new HttpException(
            'Invalid JSON file format', 
            HttpStatus.BAD_REQUEST
          );
        }
      }
      
      if (!importData) {
        throw new HttpException(
          'No data provided for import', 
          HttpStatus.BAD_REQUEST
        );
      }
      
      const result = await this.settingsService.importUserData(businessId, importData);
      return result;
    } catch (error: any) {
      console.error('Settings: Error importing data:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to import data'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('reset/:businessId')
  async resetSettings(
    @Param('businessId') businessId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: AppSettings; message: string }> {
    try {
      console.log('Settings: Resetting settings for business:', businessId);
      
      const settings = await this.settingsService.resetSettings(businessId);
      return {
        success: true,
        data: settings,
        message: 'Settings reset to defaults successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error resetting settings:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to reset settings'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-logo/:businessId')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('businessId') businessId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: { logoUrl: string }; message: string }> {
    try {
      console.log('Settings: Uploading logo for business:', businessId);
      
      if (!file) {
        throw new HttpException(
          'No file uploaded', 
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(
          'Invalid file type. Only JPEG, PNG, and GIF are allowed', 
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate file size (e.g., 5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new HttpException(
          'File size too large. Maximum 5MB allowed', 
          HttpStatus.BAD_REQUEST
        );
      }

      // Generate unique logo URL
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const logoUrl = `/uploads/logos/${businessId}-${Date.now()}.${fileExtension}`;
      
      // Update user profile with logo URL
      await this.settingsService.updateUserProfile(businessId, { businessLogo: logoUrl });
      
      console.log('Settings: Logo uploaded successfully for business:', businessId);
      
      return {
        success: true,
        data: { logoUrl },
        message: 'Logo uploaded successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error uploading logo:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to upload logo'
        }, 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Debug endpoint to check business data
  @Get('debug/businesses')
  async getBusinessIds(
    @Request() req: AuthenticatedRequest
  ): Promise<{ success: boolean; data: string[]; message: string }> {
    try {
      console.log('Settings: Getting all business IDs for debug');
      
      const businessIds = await this.settingsService.getAllBusinessIds();
      return {
        success: true,
        data: businessIds,
        message: 'Business IDs fetched successfully'
      };
    } catch (error: any) {
      console.error('Settings: Error getting business IDs:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get business IDs'
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}