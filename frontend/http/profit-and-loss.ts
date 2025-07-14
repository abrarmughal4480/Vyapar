import axios from 'axios';

export interface ProfitAndLossParticular {
  name: string;
  amount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getProfitAndLoss({ from, to, token }: { from?: string; to?: string; token: string }) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await axios.get(`${API_BASE_URL}/api/reports/profit-and-loss`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.data && res.data.success) {
    return res.data.data as ProfitAndLossParticular[];
  }
  throw new Error(res.data?.message || 'Failed to fetch profit and loss report');
} 