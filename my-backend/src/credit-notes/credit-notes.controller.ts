import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Request } from '@nestjs/common';
import { CreditNotesService, CreditNote } from './credit-notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCreditNoteDto, UpdateCreditNoteDto } from './dto/credit-notes.dto';

@Controller('credit-note')
@UseGuards(JwtAuthGuard)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Get(':businessId')
  async getCreditNotes(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: CreditNote[]; message: string }> {
    try {
      console.log('Credit Notes: Getting notes for business:', businessId);
      console.log('Credit Notes: User from JWT:', req.user?.email || 'Unknown');
      
      const notes = await this.creditNotesService.getCreditNotes(businessId);
      return {
        success: true,
        data: notes,
        message: 'Credit notes fetched successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error fetching notes:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch credit notes'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':businessId/:noteId')
  async getCreditNote(
    @Param('businessId') businessId: string,
    @Param('noteId') noteId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      console.log('Credit Notes: Getting note:', noteId, 'for business:', businessId);
      
      const note = await this.creditNotesService.getCreditNoteById(businessId, noteId);
      return {
        success: true,
        data: note,
        message: 'Credit note fetched successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error fetching note:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Credit note not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':businessId')
  async createCreditNote(
    @Param('businessId') businessId: string,
    @Body() createDto: CreateCreditNoteDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      console.log('Credit Notes: Creating note for business:', businessId);
      console.log('Credit Notes: Note data:', createDto);
      
      const note = await this.creditNotesService.createCreditNote(businessId, createDto);
      return {
        success: true,
        data: note,
        message: 'Credit note created successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error creating note:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':businessId/:noteId')
  async updateCreditNote(
    @Param('businessId') businessId: string,
    @Param('noteId') noteId: string,
    @Body() updateDto: UpdateCreditNoteDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      console.log('Credit Notes: Updating note:', noteId, 'for business:', businessId);
      
      const note = await this.creditNotesService.updateCreditNote(businessId, noteId, updateDto);
      return {
        success: true,
        data: note,
        message: 'Credit note updated successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error updating note:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':businessId/:noteId')
  async deleteCreditNote(
    @Param('businessId') businessId: string,
    @Param('noteId') noteId: string,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Credit Notes: Deleting note:', noteId, 'for business:', businessId);
      
      await this.creditNotesService.deleteCreditNote(businessId, noteId);
      return {
        success: true,
        message: 'Credit note deleted successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error deleting note:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stats/:businessId')
  async getCreditNotesStats(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      console.log('Credit Notes: Getting stats for business:', businessId);
      
      const stats = await this.creditNotesService.getCreditNotesStats(businessId);
      return {
        success: true,
        data: stats,
        message: 'Credit notes stats fetched successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error fetching stats:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch credit notes stats'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':businessId/:noteId/status')
  async updateCreditNoteStatus(
    @Param('businessId') businessId: string,
    @Param('noteId') noteId: string,
    @Body() statusData: { status: 'Draft' | 'Issued' | 'Applied' },
    @Request() req: any
  ): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      console.log('Credit Notes: Updating note status:', noteId, 'to:', statusData.status);
      
      const note = await this.creditNotesService.updateCreditNoteStatus(businessId, noteId, statusData.status);
      return {
        success: true,
        data: note,
        message: 'Credit note status updated successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error updating note status:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update credit note status'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('generate-number/:businessId')
  async generateNoteNumber(
    @Param('businessId') businessId: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: { noteNumber: string }; message: string }> {
    try {
      console.log('Credit Notes: Generating note number for business:', businessId);
      
      const result = await this.creditNotesService.generateNoteNumber(businessId);
      return {
        success: true,
        data: result,
        message: 'Note number generated successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error generating note number:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to generate note number'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Debug endpoint to check business data
  @Get('debug/businesses')
  async getBusinessIds(
    @Request() req: any
  ): Promise<{ success: boolean; data: string[]; message: string }> {
    try {
      console.log('Credit Notes: Getting all business IDs for debug');
      
      const businessIds = await this.creditNotesService.getAllBusinessIds();
      return {
        success: true,
        data: businessIds,
        message: 'Business IDs fetched successfully'
      };
    } catch (error: any) {
      console.error('Credit Notes: Error getting business IDs:', error);
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to get business IDs'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
