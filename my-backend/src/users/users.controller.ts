import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UsersService, CreateUserData } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    try {
      this.logger.log('Creating new user:', createUserDto.email);

      // Ensure businessId is provided - either from DTO or from authenticated user
      const businessId = createUserDto.businessId || req.user?.businessId;
      
      if (!businessId) {
        throw new HttpException(
          'Business ID is required to create a user',
          HttpStatus.BAD_REQUEST
        );
      }

      const userData: CreateUserData = {
        ...createUserDto,
        businessId, // Ensure businessId is always a string
      };

      const user = await this.usersService.create(userData);
      
      return {
        success: true,
        message: 'User created successfully',
        data: user,
      };
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    try {
      this.logger.log('Fetching all users');

      // Only admins can see all users, staff can only see users in their business
      let users;
      if (req.user.role === 'admin') {
        users = await this.usersService.findAll();
      } else {
        users = await this.usersService.findByBusinessId(req.user.businessId);
      }

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch users',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      this.logger.log('Fetching user:', id);

      const user = await this.usersService.findOne(id);

      // Basic access control - users can only see their own data or admin can see all
      if (req.user.role !== 'admin' && req.user.id !== id && req.user.businessId !== user.businessId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      this.logger.error('Error fetching user:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    try {
      this.logger.log('Updating user:', id);

      // Basic access control - users can only update their own data or admin can update all
      if (req.user.role !== 'admin' && req.user.id !== id) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const updatedUser = await this.usersService.update(id, updateUserDto);

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error('Error updating user:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      this.logger.log('Deleting user:', id);

      // Only admins can delete users
      if (req.user.role !== 'admin') {
        throw new HttpException('Access denied. Only admins can delete users.', HttpStatus.FORBIDDEN);
      }

      // Don't allow deleting own account
      if (req.user.id === id) {
        throw new HttpException('Cannot delete your own account', HttpStatus.BAD_REQUEST);
      }

      const result = await this.usersService.remove(id);

      return {
        success: true,
        message: result.message,
        data: { deletedUserId: result.deletedUserId },
      };
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete user',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard)
  async findByBusiness(@Param('businessId') businessId: string, @Request() req: any) {
    try {
      this.logger.log('Fetching users for business:', businessId);

      // Basic access control
      if (req.user.role !== 'admin' && req.user.businessId !== businessId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const users = await this.usersService.findByBusinessId(businessId);

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      this.logger.error('Error fetching business users:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch business users',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    try {
      this.logger.log('Fetching user profile:', req.user.id);

      const user = await this.usersService.findById(req.user.id);

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      this.logger.error('Error fetching user profile:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch user profile',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

