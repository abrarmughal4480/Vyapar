import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCreditNoteDto, UpdateCreditNoteDto } from './dto/credit-notes.dto';

export interface CreditNoteItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  tax: number;
}

export interface CreditNote {
  id: string;
  businessId: string;
  noteNumber: string;
  date: string;
  customer: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGST?: string;
  items: CreditNoteItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  reason: string;
  notes?: string;
  status: 'Draft' | 'Issued' | 'Applied';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CreditNotesService {
  private creditNotes: Map<string, CreditNote[]> = new Map();
  private nextNoteNumber = 1;

  constructor() {
    console.log('📝 Initializing Credit Notes service for real API...');
  }

  async getCreditNotes(businessId: string): Promise<CreditNote[]> {
    console.log('Getting credit notes for business:', businessId);
    
    const notes = this.creditNotes.get(businessId) || [];
    console.log(`Found ${notes.length} credit notes for business: ${businessId}`);
    
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCreditNoteById(businessId: string, noteId: string): Promise<CreditNote> {
    console.log('Getting credit note:', noteId, 'for business:', businessId);
    
    const notes = this.creditNotes.get(businessId) || [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }
    
    return note;
  }

  async createCreditNote(businessId: string, createDto: CreateCreditNoteDto): Promise<CreditNote> {
    console.log('Creating credit note for business:', businessId, createDto);
    
    const noteId = `CN-${Date.now()}-${this.nextNoteNumber++}`;
    const noteNumber = createDto.noteNumber || `CN-${String(this.nextNoteNumber).padStart(3, '0')}`;
    
    // Calculate totals
    const items = createDto.items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: item.quantity * item.price
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.amount * item.tax / 100), 0);
    const total = subtotal + taxAmount;
    
    const newCreditNote: CreditNote = {
      id: noteId,
      businessId,
      noteNumber,
      date: createDto.date || new Date().toISOString().split('T')[0],
      customer: createDto.customer,
      customerPhone: createDto.customerPhone,
      customerAddress: createDto.customerAddress,
      customerGST: createDto.customerGST,
      items,
      subtotal,
      taxAmount,
      total,
      reason: createDto.reason,
      notes: createDto.notes,
      status: createDto.status || 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store the credit note
    const businessNotes = this.creditNotes.get(businessId) || [];
    businessNotes.push(newCreditNote);
    this.creditNotes.set(businessId, businessNotes);
    
    console.log('Credit note created successfully:', noteId);
    
    return newCreditNote;
  }

  async updateCreditNote(businessId: string, noteId: string, updateDto: UpdateCreditNoteDto): Promise<CreditNote> {
    console.log('Updating credit note:', noteId, 'for business:', businessId);
    
    const businessNotes = this.creditNotes.get(businessId) || [];
    const noteIndex = businessNotes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }

    const existingNote = businessNotes[noteIndex];
    
    // Update items if provided
    let items = existingNote.items;
    let subtotal = existingNote.subtotal;
    let taxAmount = existingNote.taxAmount;
    let total = existingNote.total;
    
    if (updateDto.items) {
      items = updateDto.items.map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: item.quantity * item.price
      }));
      
      subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      taxAmount = items.reduce((sum, item) => sum + (item.amount * item.tax / 100), 0);
      total = subtotal + taxAmount;
    }

    const updatedNote: CreditNote = {
      ...existingNote,
      ...updateDto,
      items,
      subtotal,
      taxAmount,
      total,
      updatedAt: new Date().toISOString(),
    };

    businessNotes[noteIndex] = updatedNote;
    this.creditNotes.set(businessId, businessNotes);
    
    console.log('Credit note updated successfully:', noteId);
    
    return updatedNote;
  }

  async deleteCreditNote(businessId: string, noteId: string): Promise<void> {
    console.log('Deleting credit note:', noteId, 'for business:', businessId);
    
    const businessNotes = this.creditNotes.get(businessId) || [];
    const noteIndex = businessNotes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }

    businessNotes.splice(noteIndex, 1);
    this.creditNotes.set(businessId, businessNotes);
    
    console.log('Credit note deleted successfully:', noteId);
  }

  async getCreditNotesStats(businessId: string): Promise<any> {
    console.log('Getting credit notes stats for business:', businessId);
    
    const notes = this.creditNotes.get(businessId) || [];
    
    const totalNotes = notes.length;
    const draftNotes = notes.filter(n => n.status === 'Draft').length;
    const issuedNotes = notes.filter(n => n.status === 'Issued').length;
    const appliedNotes = notes.filter(n => n.status === 'Applied').length;
    const totalAmount = notes.reduce((sum, n) => sum + n.total, 0);
    
    const stats = {
      totalNotes,
      draftNotes,
      issuedNotes,
      appliedNotes,
      totalAmount,
      recentNotes: notes.slice(0, 5) // Last 5 notes
    };
    
    console.log('Credit notes stats calculated:', stats);
    
    return stats;
  }

  async updateCreditNoteStatus(businessId: string, noteId: string, status: 'Draft' | 'Issued' | 'Applied'): Promise<CreditNote> {
    console.log('Updating credit note status:', noteId, 'to:', status);
    
    return this.updateCreditNote(businessId, noteId, { status });
  }

  async generateNoteNumber(businessId: string): Promise<{ noteNumber: string }> {
    console.log('Generating note number for business:', businessId);
    
    const notes = this.creditNotes.get(businessId) || [];
    const nextNumber = notes.length + 1;
    const noteNumber = `CN-${Date.now()}-${String(nextNumber).padStart(3, '0')}`;
    
    console.log('Generated note number:', noteNumber);
    
    return { noteNumber };
  }

  // Get all business IDs (for admin/debug purposes)
  async getAllBusinessIds(): Promise<string[]> {
    const allBusinessIds = Array.from(this.creditNotes.keys());
    console.log('All business IDs with credit notes:', allBusinessIds);
    return allBusinessIds;
  }

  // Clear data for a specific business (for testing)
  async clearBusinessData(businessId: string): Promise<void> {
    console.log('Clearing credit notes data for business:', businessId);
    this.creditNotes.delete(businessId);
  }
}
