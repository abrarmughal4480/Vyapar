import { API_ENDPOINTS } from '../api-config';

export interface SaleData {
  partyName: string;
  phoneNo?: string;
  items: Array<{
    item: string;
    qty: number;
    unit?: string;
    price: number;
    amount: number;
  }>;
  discount?: string;
  discountType?: string;
  tax?: string;
  paymentType: string;
  description?: string;
  imageUrl?: string; // Add image URL field
}

export interface SaleInvoiceResponse {
  success: boolean;
  data?: any;
  message: string;
}

export const saleAPI = {
  // Create a new sale invoice
  async createSale(businessId: string, saleData: SaleData): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.create(businessId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create sale');
      }

      return result;
    } catch (error: any) {
      console.error('Error creating sale:', error);
      return {
        success: false,
        message: error.message || 'Failed to create sale',
      };
    }
  },

  // Get all sales for a business
  async getSales(businessId: string): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.getAll(businessId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch sales');
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sales',
      };
    }
  },

  // Get sale statistics
  async getSaleStats(businessId: string): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.stats(businessId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch sales stats');
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching sales stats:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sales stats',
      };
    }
  },
  // Get a specific sale by ID
  async getSaleById(businessId: string, invoiceId: string): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.getById(businessId, invoiceId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch sale');
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching sale:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sale',
      };
    }
  },

  // Update a sale
  async updateSale(businessId: string, invoiceId: string, saleData: Partial<SaleData>): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.update(businessId, invoiceId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update sale');
      }

      return result;
    } catch (error: any) {
      console.error('Error updating sale:', error);
      return {
        success: false,
        message: error.message || 'Failed to update sale',
      };
    }
  },

  // Delete a sale
  async deleteSale(businessId: string, invoiceId: string): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.delete(businessId, invoiceId), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete sale');
      }

      return result;
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete sale',
      };
    }
  },

  // Get customers for suggestions
  async getCustomers(businessId: string): Promise<SaleInvoiceResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.sale.customers(businessId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch customers');
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch customers',
      };
    }
  },
};
