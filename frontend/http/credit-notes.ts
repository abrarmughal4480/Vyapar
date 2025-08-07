import api from './api';

export interface CreditNoteItem {
  item: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
  customUnit?: string;
}

export interface CreditNoteData {
  partyName: string;
  phoneNo?: string;
  items: CreditNoteItem[];
  discount?: number;
  discountType?: string;
  taxType?: string;
  tax?: number;
  description?: string;
  imageUrl?: string;
  paymentType?: string;
  paid?: number;
}

export const createCreditNote = async (creditNote: CreditNoteData, token: string) => {
  const response = await api.post('/api/credit-notes/', creditNote, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getCreditNotesByUser = async (userId: string, token: string) => {
  const response = await api.get(`/api/credit-notes/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}; 