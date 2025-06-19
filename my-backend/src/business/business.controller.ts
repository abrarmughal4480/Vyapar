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
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.create(createBusinessDto);
  }

  @Get()
  async findAll() {
    return this.businessService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      // Basic access control
      if (req.user.role !== 'admin' && req.user.businessId !== id) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const business = await this.businessService.findById(id);
      return {
        success: true,
        data: business,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch business',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ) {
    try {
      // Only admins can update business info
      if (req.user.role !== 'admin' || req.user.businessId !== id) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const business = await this.businessService.update(id, updateData);
      return {
        success: true,
        message: 'Business updated successfully',
        data: business,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update business',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }

  @Get(':id/summary')
  async getBusinessSummary(@Param('id') id: string) {
    return this.businessService.getBusinessSummary(id);
  }
}
