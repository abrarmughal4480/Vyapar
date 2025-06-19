import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDeliveryChallanDto, UpdateDeliveryChallanDto, FilterDeliveryChallanDto } from './dto/delivery-challan.dto';

export interface ChallanItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface DeliveryChallan {
  id: string;
  businessId: string;
  challanNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGST?: string;
  items: ChallanItem[];
  totalQuantity: number;
  deliveryDate?: string;
  vehicleNumber?: string;
  driverName?: string;
  status: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DeliveryChallanService {
  private challans: DeliveryChallan[] = [];
  private nextChallanId = 1;

  constructor() {
    this.initializeDemoData();
  }

  private initializeDemoData() {
    console.log('Initializing demo data for Delivery Challan service...');
    const demoBusinesses = ['demo-business-1', 'cmbhy3jsc0007upmgu6ahk0oz'];
    
    demoBusinesses.forEach(businessId => {
      console.log(`Creating demo data for business: ${businessId}`);
      this.challans.push(
        {
          id: (this.nextChallanId++).toString(),
          businessId,
          challanNo: `DC-${Date.now()}-001`,
          date: new Date().toISOString().split('T')[0],
          customerName: 'Rajesh Kumar',
          customerPhone: '+91 98765 43210',
          customerAddress: '123 MG Road, Mumbai, Maharashtra',
          customerGST: '27AABCU9603R1ZX',
          items: [
            {
              id: '1',
              description: 'Laptop Dell Inspiron',
              quantity: 2,
              unit: 'Nos',
              remarks: 'Handle with care'
            }
          ],
          totalQuantity: 2,
          deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          vehicleNumber: 'MH 01 AB 1234',
          driverName: 'Suresh Kumar',
          status: 'Dispatched',
          notes: 'Urgent delivery required',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: (this.nextChallanId++).toString(),
          businessId,
          challanNo: `DC-${Date.now()}-002`,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          customerName: 'Priya Sharma',
          customerPhone: '+91 87654 32109',
          customerAddress: '456 Sector 18, Noida, UP',
          customerGST: '09AABCU9603R1ZY',
          items: [
            {
              id: '1',
              description: 'Office Chairs',
              quantity: 5,
              unit: 'Nos',
              remarks: 'Premium quality'
            }
          ],
          totalQuantity: 5,
          deliveryDate: new Date().toISOString().split('T')[0],
          vehicleNumber: 'UP 16 CD 5678',
          driverName: 'Amit Singh',
          status: 'Delivered',
          notes: 'Delivered successfully',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    });
    console.log(`Demo data initialized. Total challans: ${this.challans.length}`);
  }

  async getChallans(businessId: string, filters?: FilterDeliveryChallanDto): Promise<DeliveryChallan[]> {
    console.log(`Getting delivery challans for business: ${businessId}`);
    let filteredChallans = this.challans.filter(challan => 
      challan.businessId === businessId
    );

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        filteredChallans = filteredChallans.filter(c => 
          c.status.toLowerCase() === filters.status!.toLowerCase()
        );
      }

      if (filters.dateFrom) {
        filteredChallans = filteredChallans.filter(c => c.date >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        filteredChallans = filteredChallans.filter(c => c.date <= filters.dateTo!);
      }

      if (filters.customerName) {
        filteredChallans = filteredChallans.filter(c => 
          c.customerName.toLowerCase().includes(filters.customerName!.toLowerCase())
        );
      }

      if (filters.vehicleNumber) {
        filteredChallans = filteredChallans.filter(c => 
          c.vehicleNumber?.toLowerCase().includes(filters.vehicleNumber!.toLowerCase())
        );
      }
    }

    console.log(`Found ${filteredChallans.length} challans for business ${businessId}`);
    return filteredChallans.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getChallanById(businessId: string, challanId: string): Promise<DeliveryChallan> {
    const challan = this.challans.find(c => 
      c.businessId === businessId && c.id === challanId
    );
    
    if (!challan) {
      throw new NotFoundException(`Delivery challan with ID ${challanId} not found`);
    }
    
    return challan;
  }

  async createChallan(businessId: string, createChallanDto: CreateDeliveryChallanDto): Promise<DeliveryChallan> {
    console.log('Creating new delivery challan for business:', businessId);

    // Validate challan number uniqueness
    const existingChallan = this.challans.find(c => 
      c.businessId === businessId && c.challanNo === createChallanDto.challanNo
    );
    
    if (existingChallan) {
      throw new BadRequestException(`Challan number ${createChallanDto.challanNo} already exists`);
    }

    // Validate items
    if (!createChallanDto.items || createChallanDto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Calculate total quantity
    const totalQuantity = createChallanDto.items.reduce((sum, item) => sum + item.quantity, 0);

    // Create items with IDs
    const itemsWithIds: ChallanItem[] = createChallanDto.items.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit,
      remarks: item.remarks?.trim()
    }));

    const newChallan: DeliveryChallan = {
      id: (this.nextChallanId++).toString(),
      businessId,
      challanNo: createChallanDto.challanNo.trim(),
      date: createChallanDto.date,
      customerName: createChallanDto.customerName.trim(),
      customerPhone: createChallanDto.customerPhone?.trim(),
      customerAddress: createChallanDto.customerAddress?.trim(),
      customerGST: createChallanDto.customerGST?.trim().toUpperCase(),
      items: itemsWithIds,
      totalQuantity,
      deliveryDate: createChallanDto.deliveryDate,
      vehicleNumber: createChallanDto.vehicleNumber?.trim().toUpperCase(),
      driverName: createChallanDto.driverName?.trim(),
      status: createChallanDto.status || 'Draft',
      notes: createChallanDto.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.challans.push(newChallan);
    console.log('Delivery challan created successfully:', newChallan.id);
    return newChallan;
  }

  async updateChallan(businessId: string, challanId: string, updateChallanDto: UpdateDeliveryChallanDto): Promise<DeliveryChallan> {
    const challanIndex = this.challans.findIndex(c => 
      c.businessId === businessId && c.id === challanId
    );
    
    if (challanIndex === -1) {
      throw new NotFoundException(`Delivery challan with ID ${challanId} not found`);
    }

    const existingChallan = this.challans[challanIndex];

    // Validate challan number uniqueness if changed
    if (updateChallanDto.challanNo && updateChallanDto.challanNo !== existingChallan.challanNo) {
      const duplicateChallan = this.challans.find(c => 
        c.businessId === businessId && 
        c.challanNo === updateChallanDto.challanNo && 
        c.id !== challanId
      );
      
      if (duplicateChallan) {
        throw new BadRequestException(`Challan number ${updateChallanDto.challanNo} already exists`);
      }
    }

    // Update items and recalculate total quantity if items changed
    let updatedItems = existingChallan.items;
    let totalQuantity = existingChallan.totalQuantity;

    if (updateChallanDto.items) {
      updatedItems = updateChallanDto.items.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        description: item.description.trim(),
        quantity: item.quantity,
        unit: item.unit,
        remarks: item.remarks?.trim()
      }));
      totalQuantity = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    const updatedChallan: DeliveryChallan = {
      ...existingChallan,
      challanNo: updateChallanDto.challanNo?.trim() || existingChallan.challanNo,
      date: updateChallanDto.date || existingChallan.date,
      customerName: updateChallanDto.customerName?.trim() || existingChallan.customerName,
      customerPhone: updateChallanDto.customerPhone?.trim() || existingChallan.customerPhone,
      customerAddress: updateChallanDto.customerAddress?.trim() || existingChallan.customerAddress,
      customerGST: updateChallanDto.customerGST?.trim().toUpperCase() || existingChallan.customerGST,
      items: updatedItems,
      totalQuantity,
      deliveryDate: updateChallanDto.deliveryDate || existingChallan.deliveryDate,
      vehicleNumber: updateChallanDto.vehicleNumber?.trim().toUpperCase() || existingChallan.vehicleNumber,
      driverName: updateChallanDto.driverName?.trim() || existingChallan.driverName,
      status: updateChallanDto.status || existingChallan.status,
      notes: updateChallanDto.notes?.trim() || existingChallan.notes,
      updatedAt: new Date().toISOString(),
    };

    this.challans[challanIndex] = updatedChallan;
    return updatedChallan;
  }

  async deleteChallan(businessId: string, challanId: string): Promise<void> {
    const challanIndex = this.challans.findIndex(c => 
      c.businessId === businessId && c.id === challanId
    );
    
    if (challanIndex === -1) {
      throw new NotFoundException(`Delivery challan with ID ${challanId} not found`);
    }

    this.challans.splice(challanIndex, 1);
    console.log('Delivery challan deleted successfully:', challanId);
  }

  async updateChallanStatus(businessId: string, challanId: string, status: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned'): Promise<DeliveryChallan> {
    const challan = await this.getChallanById(businessId, challanId);
    
    return this.updateChallan(businessId, challanId, { status });
  }

  async getSummary(businessId: string): Promise<any> {
    const challans = await this.getChallans(businessId);
    
    const summary = {
      totalChallans: challans.length,
      totalItems: challans.reduce((sum, c) => sum + c.totalQuantity, 0),
      statusBreakdown: {
        draft: challans.filter(c => c.status === 'Draft').length,
        dispatched: challans.filter(c => c.status === 'Dispatched').length,
        delivered: challans.filter(c => c.status === 'Delivered').length,
        returned: challans.filter(c => c.status === 'Returned').length,
      },
      recentChallans: challans.slice(0, 5),
      monthlyStats: this.getMonthlyStats(challans),
    };

    return summary;
  }

  private getMonthlyStats(challans: DeliveryChallan[]): any {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyChallans = challans.filter(c => {
      const challanDate = new Date(c.date);
      return challanDate.getMonth() === currentMonth && challanDate.getFullYear() === currentYear;
    });

    return {
      currentMonth: {
        count: monthlyChallans.length,
        totalItems: monthlyChallans.reduce((sum, c) => sum + c.totalQuantity, 0),
        delivered: monthlyChallans.filter(c => c.status === 'Delivered').length,
        pending: monthlyChallans.filter(c => c.status === 'Dispatched').length,
      }
    };
  }
}
