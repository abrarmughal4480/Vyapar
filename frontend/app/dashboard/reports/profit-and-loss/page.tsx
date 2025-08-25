"use client";
import React, { useState, useEffect } from "react";
import { getProfitAndLoss, ProfitAndLossParticular } from "@/http/profit-and-loss";

const defaultParticulars: ProfitAndLossParticular[] = [
  { name: "Sale (+)", amount: 0 },
  { name: "Credit Note (-)", amount: 0 },
  { name: "Sale FA (+)", amount: 0 },
  { name: "Purchase (-)", amount: 0 },
  { name: "Debit Note (+)", amount: 0 },
  { name: "Purchase FA (-)", amount: 0 },
  { name: "Direct Expenses(-)", amount: 0 },
  { name: "Other Direct Expenses (-)", amount: 0 },
  { name: "Payment-in Discount (-)", amount: 0 },
  { name: "Tax Payable (-)", amount: 0 },
  { name: "TCS Payable (-)", amount: 0 },
  { name: "TDS Payable (-)", amount: 0 },
  { name: "Tax Receivable (+)", amount: 0 },
  { name: "TCS Receivable (+)", amount: 0 },
  { name: "TDS Receivable (+)", amount: 0 },
  { name: "Opening Stock (-)", amount: 0 },
  { name: "Closing Stock (+)", amount: 0 },
  { name: "Opening Stock FA (-)", amount: 0 },
  { name: "Closing Stock FA (+)", amount: 0 },
  { name: "Other Income (+)", amount: 0 },
  { name: "Other Expense", amount: 0 },
  { name: "Loan Interest Expense", amount: 0 },
  { name: "Loan Processing Fee Expense", amount: 0 },
  { name: "Loan Charges Expense", amount: 0 },
];

function formatAmount(amount: number): string {
  return `₨ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const ProfitAndLossPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [particulars, setParticulars] = useState<ProfitAndLossParticular[]>(defaultParticulars);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only access localStorage in useEffect to avoid hydration mismatch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let token = "";
        if (typeof window !== "undefined") {
          token = localStorage.getItem("token") || localStorage.getItem("vypar_auth_token") || "";
        }
        console.log("[P&L Debug] Token being sent to API:", token); // Debug print
        if (!token) throw new Error("User not authenticated (no token found in localStorage)");
        const data = await getProfitAndLoss({ from: dateFrom, to: dateTo, token });
        setParticulars(data);
      } catch (err: any) {
        // Show backend error if present
        if (err.response && err.response.data && err.response.data.message) {
          setError("Backend: " + err.response.data.message);
        } else {
          setError(err.message || "Failed to fetch data");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Helper to get amount by name
  const get = (name: string): number => {
    const p = particulars.find((x) => x.name === name);
    return p ? p.amount : 0;
  };

  // Calculation logic
  const grossProfit =
    get("Sale (+)") +
    get("Sale FA (+)") +
    get("Debit Note (+)") +
    get("Tax Receivable (+)") +
    get("TCS Receivable (+)") +
    get("TDS Receivable (+)") +
    get("Closing Stock (+)") +
    get("Closing Stock FA (+)")
    - (
      get("Purchase (-)") +
      get("Purchase FA (-)") +
      get("Credit Note (-)") +
      get("Direct Expenses(-)") +
      get("Other Direct Expenses (-)") +
      get("Payment-in Discount (-)") +
      get("Tax Payable (-)") +
      get("TCS Payable (-)") +
      get("TDS Payable (-)") +
      get("Opening Stock (-)") +
      get("Opening Stock FA (-)")
    );

  const netProfit =
    grossProfit +
    get("Other Income (+)") -
    (get("Other Expense") +
      get("Loan Interest Expense") +
      get("Loan Processing Fee Expense") +
      get("Loan Charges Expense"));

  // Filtered list (search only, as date filter is UI only for now)
  const filteredParticulars = particulars.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3" style={{ fontFamily: 'system-ui, Arial, sans-serif' }}>
      {/* Sticky Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Profit and Loss Report</h1>
            <p className="text-xs text-gray-500 mt-1">View your business profit and loss statement</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search particulars..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
          />
        </div>
        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[130px] text-xs"
            placeholder="From Date"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[130px] text-xs"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && <div className="text-center py-6 text-blue-600 font-semibold text-sm">Loading...</div>}
      {error && <div className="text-center py-6 text-red-600 font-semibold text-sm">{error}</div>}

      {/* Table Section */}
      {!loading && !error && (
        <div className="w-full">
          <div className="overflow-x-auto rounded-xl shadow border border-gray-200 bg-white" style={{ fontFamily: 'system-ui, Arial, sans-serif' }}>
            <table className="w-full min-w-[600px] text-xs">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs">Particulars</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Operating/Trading Account Section */}
                <tr>
                  <td colSpan={2} className="py-1.5 px-3 bg-blue-50 text-blue-700 font-bold text-sm border-b border-blue-200">Operating / Trading Account</td>
                </tr>
                {/* Sales/Income */}
                {filteredParticulars
                  .filter((p) => ["Sale (+)", "Credit Note (-)", "Sale FA (+)", "Debit Note (+)", "Purchase (-)", "Purchase FA (-)", "Opening Stock (-)", "Closing Stock (+)", "Opening Stock FA (-)", "Closing Stock FA (+)"].includes(p.name))
                  .map((p, idx) => (
                    <tr key={p.name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 border-b border-gray-100 text-xs">{p.name}</td>
                      <td className="py-2 px-3 border-b border-gray-100 text-right text-xs">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                {/* Direct Expenses Subheading */}
                <tr>
                  <td colSpan={2} className="py-1.5 px-3 bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 text-xs">Direct Expenses</td>
                </tr>
                {filteredParticulars
                  .filter((p) => ["Direct Expenses(-)", "Other Direct Expenses (-)", "Payment-in Discount (-)"].includes(p.name))
                  .map((p, idx) => (
                    <tr key={p.name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 border-b border-gray-100 text-xs">{p.name}</td>
                      <td className="py-2 px-3 border-b border-gray-100 text-right text-xs">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                {/* Tax Payable Subheading */}
                <tr>
                  <td colSpan={2} className="py-1.5 px-3 bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 text-xs">Tax Payable</td>
                </tr>
                {filteredParticulars
                  .filter((p) => ["Tax Payable (-)", "TCS Payable (-)", "TDS Payable (-)"].includes(p.name))
                  .map((p, idx) => (
                    <tr key={p.name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 border-b border-gray-100 text-xs">{p.name}</td>
                      <td className="py-2 px-3 border-b border-gray-100 text-right text-xs">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                {/* Tax Receivable Subheading */}
                <tr>
                  <td colSpan={2} className="py-1.5 px-3 bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 text-xs">Tax Receivable</td>
                </tr>
                {filteredParticulars
                  .filter((p) => ["Tax Receivable (+)", "TCS Receivable (+)", "TDS Receivable (+)"].includes(p.name))
                  .map((p, idx) => (
                    <tr key={p.name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 border-b border-gray-100 text-xs">{p.name}</td>
                      <td className="py-2 px-3 border-b border-gray-200 text-right text-xs">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                {/* Gross Profit Row */}
                <tr>
                  <td className="py-2 px-3 border-b border-gray-200 font-bold text-xs">Gross Profit</td>
                  <td
                    className={`py-2 px-3 border-b border-gray-200 text-right font-bold text-xs ${grossProfit < 0 ? 'text-red-600' : grossProfit > 0 ? 'text-green-600' : ''}`}
                  >
                    {formatAmount(grossProfit)}
                  </td>
                </tr>
                {/* Profit & Loss Account Section */}
                <tr>
                  <td colSpan={2} className="py-1.5 px-3 bg-green-50 text-green-700 font-bold text-sm border-b border-green-200">Profit & Loss Account</td>
                </tr>
                {filteredParticulars
                  .filter((p) => [
                    "Other Income (+)", "Other Expense", "Loan Interest Expense", "Loan Processing Fee Expense", "Loan Charges Expense"
                  ].includes(p.name))
                  .map((p, idx) => (
                    <tr key={p.name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-3 border-b border-gray-100 text-xs">{p.name}</td>
                      <td className="py-2 px-3 border-b border-gray-100 text-right text-xs">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                {/* Net Profit Row */}
                <tr>
                  <td className="py-2 px-3 border-b border-gray-200 font-bold text-xs">Net Profit</td>
                  <td
                    className={`py-2 px-3 border-b border-gray-200 text-right font-bold text-xs ${netProfit < 0 ? 'text-red-600' : netProfit > 0 ? 'text-green-600' : ''}`}
                  >
                    {formatAmount(netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitAndLossPage;
