import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PartiesService, Party } from './parties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePartyDto, UpdatePartyDto, BulkImportDto } from './dto/parties.dto';
import { Response } from 'express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('parties')
@UseGuards(JwtAuthGuard)
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get(':businessId')
  async getAll(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: Party[] }> {
    try {
      console.log('Getting parties for business:', businessId);
      console.log('User from JWT:', req.user);
      
      const data = await this.partiesService.getAll(businessId);
      return { success: true, data };
    } catch (e: any) {
      console.error('Error getting parties:', e.message);
      throw new HttpException({ success: false, message: e.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/count')
  async getCount(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: { count: number } }> {
    try {
      console.log('Getting parties count for business:', businessId);
      
      const data = await this.partiesService.getCount(businessId);
      return { success: true, data };
    } catch (e: any) {
      console.error('Error getting parties count:', e.message);
      throw new HttpException({ success: false, message: e.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':businessId')
  async create(
    @Param('businessId') businessId: string, 
    @Body() dto: CreatePartyDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: Party }> {
    try {
      console.log('Creating party for business:', businessId);
      console.log('Party data received:', dto);
      console.log('User from JWT:', req.user);
      
      const data = await this.partiesService.create(businessId, dto);
      return { success: true, data };
    } catch (e: any) {
      console.error('Error creating party:', e.message);
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:partyId')
  async update(
    @Param('businessId') businessId: string, 
    @Param('partyId') partyId: string, 
    @Body() dto: UpdatePartyDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: Party }> {
    try {
      console.log('Updating party:', partyId, 'for business:', businessId);
      
      const data = await this.partiesService.update(businessId, partyId, dto);
      return { success: true, data };
    } catch (e: any) {
      console.error('Error updating party:', e.message);
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:partyId')
  async delete(
    @Param('businessId') businessId: string, 
    @Param('partyId') partyId: string,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Deleting party:', partyId, 'for business:', businessId);
      
      await this.partiesService.delete(businessId, partyId);
      return { success: true, message: 'Party deleted successfully' };
    } catch (e: any) {
      console.error('Error deleting party:', e.message);
      throw new HttpException({ success: false, message: e.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/export')
  async exportParties(
    @Param('businessId') businessId: string,
    @Res() res: Response,
    @Request() req: any
  ): Promise<void> {
    try {
      console.log('Parties: Exporting parties for business:', businessId);
      
      const csvData = await this.partiesService.exportParties(businessId);
      
      const filename = `parties_${businessId}_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvData));
      
      res.send(csvData);
      
      console.log('Parties: Export completed successfully');
    } catch (error: any) {
      console.error('Parties: Error exporting parties:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to export parties'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/template')
  async downloadTemplate(
    @Param('businessId') businessId: string,
    @Res() res: Response,
    @Request() req: any
  ): Promise<void> {
    try {
      console.log('Parties: Generating import template for business:', businessId);
      
      const templateData = await this.partiesService.generateImportTemplate();
      
      const filename = `parties_import_template.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(templateData));
      
      res.send(templateData);
      
      console.log('Parties: Template generated successfully');
    } catch (error: any) {
      console.error('Parties: Error generating template:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to generate template'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':businessId/import')
  @UseInterceptors(FileInterceptor('file'))
  async importParties(
    @Param('businessId') businessId: string,
    @UploadedFile() file: MulterFile,
    @Body() importOptions?: any,
    @Request() req?: any
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Parties: Importing parties for business:', businessId);
      console.log('Parties: File info:', file ? { name: file.originalname, size: file.size, type: file.mimetype } : 'No file');
      
      if (!file) {
        throw new Error('No file uploaded');
      }

      const result = await this.partiesService.importParties(businessId, file, importOptions);
      
      return {
        success: true,
        data: result,
        message: `Successfully imported ${result.imported} parties. ${result.skipped} skipped, ${result.errors} errors.`
      };
    } catch (error: any) {
      console.error('Parties: Error importing parties:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to import parties'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':businessId/bulk-create')
  async bulkCreateParties(
    @Param('businessId') businessId: string,
    @Body() bulkData: BulkImportDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Parties: Bulk creating parties for business:', businessId);
      console.log('Parties: Bulk data:', { count: bulkData.parties?.length || 0 });
      
      const result = await this.partiesService.bulkCreateParties(businessId, bulkData);
      
      return {
        success: true,
        data: result,
        message: `Successfully created ${result.created} parties. ${result.skipped} skipped, ${result.errors} errors.`
      };
    } catch (error: any) {
      console.error('Parties: Error bulk creating parties:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to bulk create parties'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':businessId/stats')
  async getPartiesStats(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Parties: Getting stats for business:', businessId);
      
      const stats = await this.partiesService.getPartiesStats(businessId);
      
      return {
        success: true,
        data: stats,
        message: 'Parties stats fetched successfully'
      };
    } catch (error: any) {
      console.error('Parties: Error fetching stats:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch parties stats'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
