"use client";
import React, { useEffect, useState } from "react";
import { getBillWiseProfit } from "@/http/sales";
import { jwtDecode } from "jwt-decode";

const BillWiseProfitPage = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [party, setParty] = useState("");
  const [parties, setParties] = useState<string[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

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
  const [dateRange, setDateRange] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Helper to check if a bill is in the selected date range
  function isInDateRange(billDate: Date) {
    const today = new Date();
    const bill = new Date(billDate);
    switch (dateRange) {
      case 'Today':
        return bill.toDateString() === today.toDateString();
      case 'Yesterday': {
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        return bill.toDateString() === yest.toDateString();
      }
      case 'This Week': {
        const first = new Date(today);
        first.setDate(today.getDate() - today.getDay());
        const last = new Date(first);
        last.setDate(first.getDate() + 6);
        return bill >= first && bill <= last;
      }
      case 'This Month': {
        return bill.getMonth() === today.getMonth() && bill.getFullYear() === today.getFullYear();
      }
      case 'Last Month': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return bill.getMonth() === lastMonth.getMonth() && bill.getFullYear() === lastMonth.getFullYear();
      }
      case 'This Year': {
        return bill.getFullYear() === today.getFullYear();
      }
      case 'Custom': {
        if (!dateFrom && !dateTo) return true;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from && to) {
          to.setHours(23,59,59,999);
          return bill >= from && bill <= to;
        } else if (from) {
          return bill >= from;
        } else if (to) {
          to.setHours(23,59,59,999);
          return bill <= to;
        }
        return true;
      }
      default:
        return true;
    }
  }

  // Filtered bills for display
  const filteredBills = bills.filter(bill => {
    if (!bill.date) return false;
    return isInDateRange(new Date(bill.date));
  });

  // Calculate summary values
  const totalSaleAmount = filteredBills.reduce((sum, bill) => sum + (bill.totalSaleAmount || 0), 0);
  const netProfit = filteredBills.reduce((sum, bill) => sum + (bill.profit || 0), 0);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      try {
        const token = (typeof window !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("vypar_auth_token"))) || "";
        if (!token) {
          setBills([]);
          setTotalProfit(0);
          setLoading(false);
          return;
        }
        const result = await getBillWiseProfit(token, party);
        if (result && result.success && Array.isArray(result.bills)) {
          setBills(result.bills);
          setTotalProfit(result.totalProfit || 0);
          // Extract unique parties for filter dropdown
          const uniqueParties = Array.from(new Set(result.bills.map((b: any) => b.party).filter(Boolean))) as string[];
          setParties(uniqueParties);
        } else {
          setBills([]);
          setTotalProfit(0);
        }
      } catch (err) {
        setBills([]);
        setTotalProfit(0);
      }
      setLoading(false);
    };
    fetchBills();
  }, [party]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleShowDetails = (bill: any) => {
    setSelectedBill(bill);
    setShowDetails(true);
  };

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Bill Wise Profit</h1>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">Party:</label>
            <select
              value={party}
              onChange={e => setParty(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Parties</option>
              {parties.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <label className="text-xs font-medium text-gray-700 ml-3">Time:</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              {dateRanges.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {dateRange === 'Custom' && (
              <>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="ml-2 px-2 py-1 rounded border border-gray-300 text-xs"
                />
                <span className="mx-1 text-xs">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 text-xs"
                />
              </>
            )}
          </div>
        </div>
        {/* Summary Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2 mb-2">
          <div className="text-sm font-bold">
            Total Sale Amount (After Discounts): <span className="text-blue-700">{formatCurrency(totalSaleAmount)}</span>
          </div>
          <div className="text-sm font-bold">
            Total Profit(+)/Loss(-): {netProfit === 0 ? (
              <span className="text-gray-500">{formatCurrency(0)}</span>
            ) : netProfit > 0 ? (
              <span className="text-green-600">{formatCurrency(netProfit)}</span>
            ) : (
              <span className="text-red-600">{formatCurrency(netProfit)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
          <h2 className="text-base font-semibold text-gray-900">Bills</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Ref No</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Party</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Total Sale Amount (After Discounts)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Profit / Loss</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm font-medium">Loading...</td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm font-medium">No bills found.</td>
                </tr>
              ) : (
                filteredBills.map((bill, idx) => (
                  <tr key={bill.refNo || idx} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">{bill.date ? new Date(bill.date).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="px-4 py-3 text-xs text-blue-700 font-bold whitespace-nowrap text-center">{bill.refNo}</td>
                    <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">{bill.party}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap text-center">{formatCurrency(bill.totalSaleAmount)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-center">
                      {bill.profit === 0 ? (
                        <span className="text-gray-500">PKR 0.00</span>
                      ) : bill.profit > 0 ? (
                        <span className="text-green-600">PKR {Math.abs(bill.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-red-600">PKR -{Math.abs(bill.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-center">
                      <button 
                        onClick={() => handleShowDetails(bill)}
                        className="text-blue-600 hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-gray-900">
                Bill Details - {selectedBill.refNo}
              </h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-3 text-sm">
              <p><strong>Party:</strong> {selectedBill.party}</p>
              <p><strong>Date:</strong> {selectedBill.date ? new Date(selectedBill.date).toLocaleDateString('en-GB') : '-'}</p>
              <p><strong>Total Sale Amount (After Item Discounts):</strong> {formatCurrency(selectedBill.totalSaleAmount)}</p>
              <p><strong>Total Profit/Loss:</strong> {selectedBill.profit > 0 ? <span className="text-green-600">{formatCurrency(selectedBill.profit)}</span> : <span className="text-red-600">{formatCurrency(selectedBill.profit)}</span>}</p>
            </div>

            {selectedBill.details && selectedBill.details.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-2 text-sm">Item Details:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-3 py-1.5 text-left text-xs">Item</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Qty</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Original Price</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Discount</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Sale Price</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Purchase Price</th>
                        <th className="border px-3 py-1.5 text-center text-xs">Profit/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.details.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="border px-3 py-1.5 text-xs">{item.item}</td>
                          <td className="border px-3 py-1.5 text-center text-xs">{item.qty}</td>
                          <td className="border px-3 py-1.5 text-center text-xs">{formatCurrency(item.originalPrice)}</td>
                          <td className="border px-3 py-1.5 text-center text-xs text-red-600">-{formatCurrency(item.itemDiscount)}</td>
                          <td className="border px-3 py-1.5 text-center text-xs font-semibold">{formatCurrency(item.salePrice)}</td>
                          <td className="border px-3 py-1.5 text-center text-xs">{formatCurrency(item.purchasePrice)}</td>
                          <td className={`border px-3 py-1.5 text-center text-xs ${item.itemProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.itemProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No item details available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillWiseProfitPage;
