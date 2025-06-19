import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePartyDto, UpdatePartyDto } from './dto/parties.dto';

export interface Party {
  id: string;
  businessId: string;
  name: string;
  type: 'Customer' | 'Supplier' | 'Both';
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  balance: number;
  isActive: boolean;
  city?: string;
  state?: string;
  pincode?: string;
  pan?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PartiesService {
  private parties: Map<string, Party[]> = new Map();
  private nextPartyId = 1;

  constructor() {
    console.log('👥 Initializing Parties service for real API...');
  }

  async getParties(businessId: string): Promise<Party[]> {
    console.log('Getting parties for business:', businessId);
    
    const parties = this.parties.get(businessId) || [];
    console.log(`Found ${parties.length} parties for business: ${businessId}`);
    
    return parties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAll(businessId: string): Promise<Party[]> {
    return this.getParties(businessId);
  }

  async getCount(businessId: string): Promise<{ count: number }> {
    const parties = this.parties.get(businessId) || [];
    return { count: parties.length };
  }

  async getPartyById(businessId: string, partyId: string): Promise<Party> {
    console.log('Getting party:', partyId, 'for business:', businessId);
    
    const parties = this.parties.get(businessId) || [];
    const party = parties.find(p => p.id === partyId);
    
    if (!party) {
      throw new NotFoundException(`Party with ID ${partyId} not found`);
    }
    
    return party;
  }

  async create(businessId: string, createDto: CreatePartyDto): Promise<Party> {
    console.log('Creating party for business:', businessId, createDto);
    
    const partyId = `party-${Date.now()}-${this.nextPartyId++}`;
    
    const newParty: Party = {
      id: partyId,
      businessId,
      name: createDto.name,
      type: createDto.type,
      phone: createDto.phone,
      email: createDto.email,
      address: createDto.address,
      gstNumber: createDto.gstNumber,
      balance: createDto.balance || 0,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      city: createDto.city,
      state: createDto.state,
      pincode: createDto.pincode,
      pan: createDto.pan,
      notes: createDto.notes,
      tags: createDto.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const businessParties = this.parties.get(businessId) || [];
    businessParties.push(newParty);
    this.parties.set(businessId, businessParties);
    
    console.log('Party created successfully:', partyId);
    
    return newParty;
  }

  async createParty(businessId: string, createDto: CreatePartyDto): Promise<Party> {
    return this.create(businessId, createDto);
  }

  async update(businessId: string, partyId: string, updateDto: UpdatePartyDto): Promise<Party> {
    console.log('Updating party:', partyId, 'for business:', businessId);
    
    const businessParties = this.parties.get(businessId) || [];
    const partyIndex = businessParties.findIndex(p => p.id === partyId);
    
    if (partyIndex === -1) {
      throw new NotFoundException(`Party with ID ${partyId} not found`);
    }

    const existingParty = businessParties[partyIndex];
    
    const updatedParty: Party = {
      ...existingParty,
      ...updateDto,
      updatedAt: new Date().toISOString(),
    };

    businessParties[partyIndex] = updatedParty;
    this.parties.set(businessId, businessParties);
    
    console.log('Party updated successfully:', partyId);
    
    return updatedParty;
  }

  async updateParty(businessId: string, partyId: string, updateDto: UpdatePartyDto): Promise<Party> {
    return this.update(businessId, partyId, updateDto);
  }

  async delete(businessId: string, partyId: string): Promise<void> {
    console.log('Deleting party:', partyId, 'for business:', businessId);
    
    const businessParties = this.parties.get(businessId) || [];
    const partyIndex = businessParties.findIndex(p => p.id === partyId);
    
    if (partyIndex === -1) {
      throw new NotFoundException(`Party with ID ${partyId} not found`);
    }

    businessParties.splice(partyIndex, 1);
    this.parties.set(businessId, businessParties);
    
    console.log('Party deleted successfully:', partyId);
  }

  async deleteParty(businessId: string, partyId: string): Promise<void> {
    return this.delete(businessId, partyId);
  }

  async getPartiesStats(businessId: string): Promise<any> {
    console.log('Getting parties stats for business:', businessId);
    
    const parties = this.parties.get(businessId) || [];
    
    const totalParties = parties.length;
    const customers = parties.filter(p => p.type === 'Customer' || p.type === 'Both').length;
    const suppliers = parties.filter(p => p.type === 'Supplier' || p.type === 'Both').length;
    const activeParties = parties.filter(p => p.isActive).length;
    const totalReceivables = parties.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0);
    const totalPayables = Math.abs(parties.filter(p => p.balance < 0).reduce((sum, p) => sum + p.balance, 0));
    
    const stats = {
      totalParties,
      customers,
      suppliers,
      activeParties,
      totalReceivables,
      totalPayables,
      recentParties: parties.slice(0, 5)
    };
    
    console.log('Parties stats calculated:', stats);
    
    return stats;
  }

  async exportParties(businessId: string): Promise<string> {
    console.log('Exporting parties for business:', businessId);
    
    const parties = await this.getParties(businessId);
    
    const headers = ['Name', 'Type', 'Phone', 'Email', 'GST Number', 'Balance', 'Status', 'Address', 'City', 'State', 'Pincode', 'PAN', 'Notes', 'Tags'];
    const csvContent = [
      headers.join(','),
      ...parties.map(party => [
        `"${party.name || ''}"`,
        `"${party.type || ''}"`,
        `"${party.phone || ''}"`,
        `"${party.email || ''}"`,
        `"${party.gstNumber || ''}"`,
        party.balance || 0,
        party.isActive ? 'Active' : 'Inactive',
        `"${party.address || ''}"`,
        `"${party.city || ''}"`,
        `"${party.state || ''}"`,
        `"${party.pincode || ''}"`,
        `"${party.pan || ''}"`,
        `"${party.notes || ''}"`,
        `"${(party.tags || []).join('; ')}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  async generateImportTemplate(): Promise<string> {
    const headers = ['Name', 'Type', 'Phone', 'Email', 'GST Number', 'Balance', 'Status', 'Address', 'City', 'State', 'Pincode', 'PAN', 'Notes', 'Tags'];
    const sampleData = [
      'John Doe', 'Customer', '9876543210', 'john@example.com', '27AABCU9603R1ZX', '1000', 'Active', '123 Main St', 'Mumbai', 'Maharashtra', '400001', 'ABCDE1234F', 'VIP Customer', 'Premium, Wholesale'
    ];
    
    return [headers.join(','), sampleData.join(',')].join('\n');
  }

  async importParties(businessId: string, file: any, options?: any): Promise<any> {
    console.log('Importing parties for business:', businessId);
    
    return {
      imported: 0,
      skipped: 0,
      errors: 0,
      message: 'Import functionality not implemented yet'
    };
  }

  async bulkCreateParties(businessId: string, bulkData: any): Promise<any> {
    console.log('Bulk creating parties for business:', businessId);
    
    if (!bulkData.parties || !Array.isArray(bulkData.parties)) {
      throw new Error('Invalid bulk data format');
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const partyData of bulkData.parties) {
      try {
        await this.create(businessId, partyData);
        created++;
      } catch (error) {
        errors++;
        errorMessages.push(`Failed to create ${partyData.name}: ${error.message}`);
        skipped++;
      }
    }

    return {
      created,
      skipped,
      errors,
      errorMessages
    };
  }

  async getAllBusinessIds(): Promise<string[]> {
    const allBusinessIds = Array.from(this.parties.keys());
    console.log('All business IDs with parties:', allBusinessIds);
    return allBusinessIds;
  }

  async clearBusinessData(businessId: string): Promise<void> {
    console.log('Clearing parties data for business:', businessId);
    this.parties.delete(businessId);
  }
}