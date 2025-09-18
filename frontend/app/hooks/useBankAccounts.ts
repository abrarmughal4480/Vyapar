import { useState, useEffect } from 'react';
import { bankAccountAPI } from '@/http/cash-bank';
import { getToken } from '../lib/auth';

export interface BankAccount {
  _id: string;
  accountDisplayName: string;
  currentBalance: number;
  bankName?: string;
  accountNumber?: string;
}

export function useBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        setError('Please login to continue');
        return;
      }

      const response = await bankAccountAPI.getAll(token);
      if (response.success) {
        setBankAccounts(response.data || []);
      } else {
        setError(response.message || 'Failed to load bank accounts');
      }
    } catch (err) {
      console.error('Error loading bank accounts:', err);
      setError('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
  }, []);

  return {
    bankAccounts,
    loading,
    error,
    refetch: loadBankAccounts
  };
}
