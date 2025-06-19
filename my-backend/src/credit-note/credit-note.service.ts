import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCreditNoteDto, UpdateCreditNoteDto, CreditNote, CreditNoteItem } from './dto/credit-note.dto';

@Injectable()
export class CreditNoteService {
  private creditNotes: Map<string, CreditNote[]> = new Map();
  private noteCounter = 1;

  constructor() {
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    const demoBusinessId = 'demo-business-1';
    
    const demoCreditNotes: CreditNote[] = [
      {
        id: '1',
        noteNumber: 'CN-001',
        date: '2024-01-15',
        customer: 'Rajesh Kumar',
        customerPhone: '+91 98765 43210',
        customerAddress: '123 MG Road, Mumbai',
        customerGST: '27AABCU9603R1ZX',
        items: [
          { id: '1', name: 'Laptop Dell', quantity: 1, price: 50000, amount: 50000, tax: 18 }
        ],
        subtotal: 50000,
        taxAmount: 9000,
        total: 59000,
        reason: 'Product return',
        notes: 'Defective product returned',
        status: 'Issued',
        businessId: demoBusinessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        noteNumber: 'CN-002',
        date: '2024-01-16',
        customer: 'Priya Sharma',
        customerPhone: '+91 87654 32109',
        customerAddress: '456 Park Street, Delhi',
        customerGST: '07AABCU9603R1ZY',
        items: [
          { id: '2', name: 'Mobile Phone', quantity: 1, price: 25000, amount: 25000, tax: 18 }
        ],
        subtotal: 25000,
        taxAmount: 4500,
        total: 29500,
        reason: 'Pricing error',
        notes: 'Incorrect pricing in original invoice',
        status: 'Draft',
        businessId: demoBusinessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.creditNotes.set(demoBusinessId, demoCreditNotes);
    this.noteCounter = 3;
  }

  // Get all credit notes for a business
  async getCreditNotes(businessId: string): Promise<CreditNote[]> {
    const notes = this.creditNotes.get(businessId) || [];
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get credit note by ID
  async getCreditNoteById(businessId: string, noteId: string): Promise<CreditNote> {
    const notes = this.creditNotes.get(businessId) || [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }
    
    return note;
  }

  // Create new credit note
  async createCreditNote(businessId: string, createCreditNoteDto: CreateCreditNoteDto): Promise<CreditNote> {
    // Validate input
    if (!createCreditNoteDto.customer || createCreditNoteDto.items.length === 0) {
      throw new BadRequestException('Customer and items are required');
    }

    if (createCreditNoteDto.total <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    const notes = this.creditNotes.get(businessId) || [];
    
    // Check for duplicate note numbers
    if (notes.some(note => note.noteNumber === createCreditNoteDto.noteNumber)) {
      throw new BadRequestException('Credit note number already exists');
    }

    // Create new credit note
    const newCreditNote: CreditNote = {
      id: (this.noteCounter++).toString(),
      noteNumber: createCreditNoteDto.noteNumber,
      date: createCreditNoteDto.date,
      customer: createCreditNoteDto.customer,
      customerPhone: createCreditNoteDto.customerPhone,
      customerAddress: createCreditNoteDto.customerAddress,
      customerGST: createCreditNoteDto.customerGST,
      items: createCreditNoteDto.items.map(item => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...item
      })),
      subtotal: createCreditNoteDto.subtotal,
      taxAmount: createCreditNoteDto.taxAmount,
      total: createCreditNoteDto.total,
      reason: createCreditNoteDto.reason,
      notes: createCreditNoteDto.notes,
      status: createCreditNoteDto.status || 'Draft',
      businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(newCreditNote);
    this.creditNotes.set(businessId, notes);

    return newCreditNote;
  }

  // Update credit note
  async updateCreditNote(businessId: string, noteId: string, updateCreditNoteDto: UpdateCreditNoteDto): Promise<CreditNote> {
    const notes = this.creditNotes.get(businessId) || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }

    const existingNote = notes[noteIndex];
    
    // Update note
    const updatedNote: CreditNote = {
      ...existingNote,
      ...updateCreditNoteDto,
      updatedAt: new Date().toISOString()
    };

    notes[noteIndex] = updatedNote;
    this.creditNotes.set(businessId, notes);

    return updatedNote;
  }

  // Delete credit note
  async deleteCreditNote(businessId: string, noteId: string): Promise<void> {
    const notes = this.creditNotes.get(businessId) || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      throw new NotFoundException(`Credit note with ID ${noteId} not found`);
    }

    notes.splice(noteIndex, 1);
    this.creditNotes.set(businessId, notes);
  }

  // Get credit notes summary
  async getCreditNotesSummary(businessId: string, dateFrom?: string, dateTo?: string): Promise<{
    totalNotes: number;
    totalAmount: number;
    draftCount: number;
    issuedCount: number;
    appliedCount: number;
    notesByStatus: { status: string; count: number; amount: number }[];
  }> {
    let notes = this.creditNotes.get(businessId) || [];
    
    // Filter by date range if provided
    if (dateFrom || dateTo) {
      notes = notes.filter(note => {
        const noteDate = new Date(note.date);
        if (dateFrom && noteDate < new Date(dateFrom)) return false;
        if (dateTo && noteDate > new Date(dateTo)) return false;
        return true;
      });
    }

    const totalAmount = notes.reduce((sum, note) => sum + note.total, 0);
    const draftCount = notes.filter(n => n.status === 'Draft').length;
    const issuedCount = notes.filter(n => n.status === 'Issued').length;
    const appliedCount = notes.filter(n => n.status === 'Applied').length;

    const notesByStatus = [
      {
        status: 'Draft',
        count: draftCount,
        amount: notes.filter(n => n.status === 'Draft').reduce((sum, n) => sum + n.total, 0)
      },
      {
        status: 'Issued',
        count: issuedCount,
        amount: notes.filter(n => n.status === 'Issued').reduce((sum, n) => sum + n.total, 0)
      },
      {
        status: 'Applied',
        count: appliedCount,
        amount: notes.filter(n => n.status === 'Applied').reduce((sum, n) => sum + n.total, 0)
      }
    ];

    return {
      totalNotes: notes.length,
      totalAmount,
      draftCount,
      issuedCount,
      appliedCount,
      notesByStatus
    };
  }

  // Generate credit note number
  async generateCreditNoteNumber(businessId: string): Promise<string> {
    const notes = this.creditNotes.get(businessId) || [];
    const currentYear = new Date().getFullYear();
    const nextNumber = notes.length + 1;
    return `CN-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }
}
