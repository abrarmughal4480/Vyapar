'use client'
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getBillWiseProfit } from '@/http/sales';
import { fetchPartiesByUserId } from '@/http/parties';

const dateRanges = [
  { value: 'All', label: 'All Time' },
  { value: 'Today', label: 'Today' },
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'This Week', label: 'This Week' },
  { value: 'This Month', label: 'This Month' },
  { value: 'Last Month', label: 'Last Month' },
  { value: 'This Year', label: 'This Year' },
  { value: 'Custom', label: 'Custom Range' },
];

const PartyWiseProfitAndLossPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [partyPhones, setPartyPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || '';
        // Fetch parties for phone numbers
        const partiesRes = await fetchPartiesByUserId(token);
        const phoneMap: Record<string, string> = {};
        if (Array.isArray(partiesRes.data)) {
          partiesRes.data.forEach((party: any) => {
            if (party.name) phoneMap[party.name] = party.phone || '';
          });
        }
        setPartyPhones(phoneMap);
        // Fetch bill-wise profit
        const res = await getBillWiseProfit(token);
        if (res && res.bills) {
          const partyMap: Record<string, { party: string, totalSale: number, totalProfit: number, billCount: number, bills: any[] }> = {};
          res.bills.forEach((bill: any) => {
            const party = bill.party || 'Unknown';
            if (!partyMap[party]) {
              partyMap[party] = { party, totalSale: 0, totalProfit: 0, billCount: 0, bills: [] };
            }
            partyMap[party].totalSale += bill.totalSaleAmount || 0;
            partyMap[party].totalProfit += bill.profit || 0;
            partyMap[party].billCount += 1;
            partyMap[party].bills.push(bill);
          });
          setData(Object.values(partyMap));
        } else {
          setData([]);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered data based on search and date
  const filteredData = useMemo(() => {
    let filtered = [...data];
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (partyPhones[row.party] || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Date filter (filter bills inside each party)
    if (filterType !== 'All' || dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      filtered = filtered.map(row => {
        const bills = row.bills.filter((bill: any) => {
          const billDate = bill.date ? new Date(bill.date) : bill.createdAt ? new Date(bill.createdAt) : null;
          if (!billDate) return true;
          if (fromDate && billDate < fromDate) return false;
          if (toDate) {
            // Include the whole day for 'to' date
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (billDate > to) return false;
          }
          return true;
        });
        // Recalculate totals for filtered bills
        return {
          ...row,
          totalSale: bills.reduce((sum: number, b: any) => sum + (b.totalSaleAmount || 0), 0),
          totalProfit: bills.reduce((sum: number, b: any) => sum + (b.profit || 0), 0),
          billCount: bills.length,
        };
      }).filter(row => row.billCount > 0);
    }
    return filtered;
  }, [data, searchTerm, filterType, dateFrom, dateTo, partyPhones]);

  // Calculate summary totals
  const summary = useMemo(() => {
    let totalSale = 0;
    let totalProfit = 0;
    filteredData.forEach(row => {
      totalSale += row.totalSale || 0;
      totalProfit += row.totalProfit || 0;
    });
    return { totalSale, totalProfit };
  }, [filteredData]);

  const formatCurrency = (amount: number) =>
    `₨ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Date dropdown outside click handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node) &&
        dateDropdownButtonRef.current &&
        !dateDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateDropdown]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 border border-gray-100">
        <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Party Wise Profit and Loss</h1>
            <p className="text-sm text-gray-500 mt-1">View profit and loss summary for each party</p>
          </div>
        </div>
      </div>
      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search party or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Date Range Dropdown */}
          <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
            <div ref={dateDropdownRef} className="relative w-full sm:w-56">
              <button
                ref={dateDropdownButtonRef}
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group"
                onClick={() => setShowDateDropdown((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={showDateDropdown ? 'true' : 'false'}
              >
                <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                <svg className={`w-5 h-5 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showDateDropdown && (
                <ul
                  className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
                  style={{ top: '110%', left: 0 }}
                  tabIndex={-1}
                  role="listbox"
                >
                  {dateRanges.map((range) => (
                    <li
                      key={range.value}
                      className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${filterType === range.value ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
                      onClick={() => {
                        setFilterType(range.value);
                        // Auto-fill date pickers for quick ranges
                        const today = new Date();
                        let from = '', to = '';
                        if (range.value === 'Today') {
                          from = to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'Yesterday') {
                          const yest = new Date(today);
                          yest.setDate(today.getDate() - 1);
                          from = to = yest.toISOString().slice(0, 10);
                        } else if (range.value === 'This Week') {
                          const first = new Date(today);
                          first.setDate(today.getDate() - today.getDay());
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'This Month') {
                          const first = new Date(today.getFullYear(), today.getMonth(), 1);
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'Last Month') {
                          const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const last = new Date(today.getFullYear(), today.getMonth(), 0);
                          from = first.toISOString().slice(0, 10);
                          to = last.toISOString().slice(0, 10);
                        } else if (range.value === 'This Year') {
                          const first = new Date(today.getFullYear(), 0, 1);
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'All') {
                          from = '';
                          to = '';
                        }
                        if (range.value !== 'Custom') {
                          setDateFrom(from);
                          setDateTo(to);
                        }
                        setShowDateDropdown(false);
                      }}
                      role="option"
                      aria-selected={filterType === range.value}
                    >
                      {range.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Date Pickers */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (filterType !== 'Custom') setFilterType('Custom');
              }}
              className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              placeholder="From Date"
              disabled={filterType !== 'Custom' && filterType !== 'All'}
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (filterType !== 'Custom') setFilterType('Custom');
              }}
              className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              placeholder="To Date"
              disabled={filterType !== 'Custom' && filterType !== 'All'}
            />
          </div>
        </div>
      </div>
      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto border border-gray-100 mb-8 relative pb-24">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profit/Loss Summary</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Party</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total Sale</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Profit(+) / Loss(-)</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Bill Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">No data</td></tr>
                ) : filteredData.map((row, idx) => (
                  <tr key={row.party} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{row.party}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{partyPhones[row.party] || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">{formatCurrency(row.totalSale)}</td>
                    <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap text-center ${row.totalProfit < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(row.totalProfit)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-center">{row.billCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Summary Bar (fixed at bottom of card) */}
        <div className="absolute left-0 right-0 bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-b-2xl">
          <div className="text-base font-semibold text-gray-700">Total Sale Amount: <span className="text-blue-700">{formatCurrency(summary.totalSale)}</span></div>
          <div className="text-base font-semibold text-gray-700">Total Profit(+) / Loss (-): <span className={summary.totalProfit < 0 ? 'text-red-600' : 'text-green-700'}>{formatCurrency(summary.totalProfit)}</span></div>
        </div>
      </div>
    </div>
  );
};

export default PartyWiseProfitAndLossPage;