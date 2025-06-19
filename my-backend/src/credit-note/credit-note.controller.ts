import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpException, Query } from '@nestjs/common';
import { CreditNoteService } from './credit-note.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { 
  CreateCreditNoteDto, 
  UpdateCreditNoteDto, 
  DateRangeDto,
  CreditNote 
} from './dto/credit-note.dto';

@Controller('credit-note')
@UseGuards(JwtAuthGuard)
export class CreditNoteController {
  constructor(private readonly creditNoteService: CreditNoteService) {}

  // Get all credit notes
  @Get(':businessId')
  async getCreditNotes(@Param('businessId') businessId: string): Promise<{ success: boolean; data: CreditNote[]; message: string }> {
    try {
      const notes = await this.creditNoteService.getCreditNotes(businessId);
      return {
        success: true,
        data: notes,
        message: 'Credit notes fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch credit notes'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get credit note by ID
  @Get(':businessId/:noteId')
  async getCreditNote(@Param('businessId') businessId: string, @Param('noteId') noteId: string): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      const note = await this.creditNoteService.getCreditNoteById(businessId, noteId);
      return {
        success: true,
        data: note,
        message: 'Credit note fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Credit note not found'
      }, HttpStatus.NOT_FOUND);
    }
  }

  // Create new credit note
  @Post(':businessId')
  async createCreditNote(@Param('businessId') businessId: string, @Body() createCreditNoteDto: CreateCreditNoteDto): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      const note = await this.creditNoteService.createCreditNote(businessId, createCreditNoteDto);
      return {
        success: true,
        data: note,
        message: 'Credit note created successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to create credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Update credit note
  @Put(':businessId/:noteId')
  async updateCreditNote(
    @Param('businessId') businessId: string,
    @Param('noteId') noteId: string,
    @Body() updateCreditNoteDto: UpdateCreditNoteDto
  ): Promise<{ success: boolean; data: CreditNote; message: string }> {
    try {
      const note = await this.creditNoteService.updateCreditNote(businessId, noteId, updateCreditNoteDto);
      return {
        success: true,
        data: note,
        message: 'Credit note updated successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to update credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Delete credit note
  @Delete(':businessId/:noteId')
  async deleteCreditNote(@Param('businessId') businessId: string, @Param('noteId') noteId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.creditNoteService.deleteCreditNote(businessId, noteId);
      return {
        success: true,
        message: 'Credit note deleted successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to delete credit note'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  // Get summary
  @Get('summary/:businessId')
  async getCreditNotesSummary(
    @Param('businessId') businessId: string,
    @Query() dateRange: DateRangeDto
  ) {
    try {
      const summary = await this.creditNoteService.getCreditNotesSummary(
        businessId,
        dateRange.dateFrom,
        dateRange.dateTo
      );
      return {
        success: true,
        data: summary,
        message: 'Credit notes summary fetched successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to fetch summary'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Generate credit note number
  @Get('generate-number/:businessId')
  async generateCreditNoteNumber(@Param('businessId') businessId: string) {
    try {
      const noteNumber = await this.creditNoteService.generateCreditNoteNumber(businessId);
      return {
        success: true,
        data: { noteNumber },
        message: 'Credit note number generated successfully'
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to generate note number'
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
