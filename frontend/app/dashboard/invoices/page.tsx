"use client";
import React, { useRef, useState, useEffect } from "react";
import { QrCode, FileText, Printer } from "lucide-react";

// Constants
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Thermal: { width: 80, height: 200 },
} as const;

const mmToPx = (mm: number) => mm * 3.78;

// Sample data - adding more items to test overflow
const invoiceData = {
  invoiceNumber: "INV-0001",
  invoiceDate: "21/06/2024",
  dueDate: "28/06/2024",
  status: "Paid",
  customer: {
    name: "Ali Khan",
    phone: "+92 300 1234567",
    address: "123 Main Street, Lahore, Pakistan",
  },
  business: {
    name: "Devease Digital Pvt Ltd.",
    address: "456 Business Ave, Karachi, Pakistan",
    phone: "+92 21 9876543",
    email: "info@deveasedigital.com",
  },
  items: [
    { name: "Rice - Basmati 1kg", qty: 5, unit: "kg", rate: 250, amount: 1250 },
    { name: "Sugar - 2kg", qty: 2, unit: "kg", rate: 180, amount: 360 },
    { name: "Cooking Oil 1L", qty: 3, unit: "ltr", rate: 500, amount: 1500 },
    { name: "Tea Pack", qty: 1, unit: "box", rate: 800, amount: 800 },
    { name: "Wheat Flour - 5kg", qty: 2, unit: "kg", rate: 400, amount: 800 },
    { name: "Red Lentils - 1kg", qty: 3, unit: "kg", rate: 200, amount: 600 },
    { name: "Chicken - Fresh 1kg", qty: 2, unit: "kg", rate: 600, amount: 1200 },
    { name: "Tomatoes - Fresh 1kg", qty: 4, unit: "kg", rate: 80, amount: 320 },
    { name: "Onions - Red 1kg", qty: 3, unit: "kg", rate: 60, amount: 180 },
    { name: "Potatoes - Fresh 1kg", qty: 5, unit: "kg", rate: 40, amount: 200 },
    { name: "Milk - 1 Liter", qty: 2, unit: "ltr", rate: 120, amount: 240 },
    { name: "Bread - Whole Wheat", qty: 3, unit: "pcs", rate: 80, amount: 240 },
  ],
  discount: 200,
  tax: 100,
  paymentType: "Cash",
  received: "8500.00",
  description: "Thank you for your business! Please pay by the due date.",
  qrUrl: "https://deveasedigital.com/invoice/INV-0001",
};

// Utility functions
const calculateTotals = (items: typeof invoiceData.items) => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = subtotal - invoiceData.discount + invoiceData.tax;
  const balance = grandTotal - parseFloat(invoiceData.received);
  return { subtotal, grandTotal, balance };
};

// QR Code Component
const QRCodeDisplay: React.FC<{ value: string; size?: number }> = ({ value, size = 64 }) => (
  <div 
    className="border-2 border-gray-300 flex items-center justify-center bg-white"
    style={{ width: size, height: size }}
  >
    <QrCode size={size * 0.6} className="text-gray-600" />
  </div>
);

// Invoice Header Component
const InvoiceHeader: React.FC<{ 
  isA4: boolean; 
  isThermal: boolean; 
  data: typeof invoiceData 
}> = ({ isA4, isThermal, data }) => {
  if (isThermal) {
    return (
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h1 className="text-sm font-bold tracking-wider uppercase">{data.business.name}</h1>
        <div className="text-xs mt-1">
          <div>Invoice: {data.invoiceNumber}</div>
          <div>Date: {data.invoiceDate}</div>
          <div>Customer: {data.customer.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.business.name}</h1>
          <p className="text-sm text-gray-600">Invoice #{data.invoiceNumber}</p>
          <p className="text-sm text-gray-500">{data.business.address}</p>
          <p className="text-sm text-gray-500">
            {data.business.phone} | {data.business.email}
          </p>
        </div>
      </div>
      <div className="text-center">
        <QRCodeDisplay value={data.qrUrl} />
        <p className="text-xs text-gray-500 mt-1">Scan to view</p>
      </div>
    </div>
  );
};

// Customer Details Component
const CustomerDetails: React.FC<{ 
  isA4: boolean; 
  isThermal: boolean;
  data: typeof invoiceData;
  totals: ReturnType<typeof calculateTotals>;
}> = ({ isA4, isThermal, data, totals }) => {
  if (isThermal) {
    return (
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-xs">
        <div className="text-center font-bold mb-1">CUSTOMER</div>
        <div>Name: {data.customer.name}</div>
        <div>Phone: {data.customer.phone}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 border-b border-gray-200 pb-4 mb-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold">{data.customer.name}</p>
          <p className="text-sm text-gray-600">{data.customer.phone}</p>
          <p className="text-sm text-gray-600">{data.customer.address}</p>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Invoice Details</h3>
        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Date:</span>
            <span>{data.invoiceDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Due Date:</span>
            <span>{data.dueDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Payment:</span>
            <span>{data.paymentType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Status:</span>
            <span className={`font-semibold ${totals.balance <= 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              {totals.balance <= 0 ? 'Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Items Table Component
const ItemsTable: React.FC<{ 
  isA4: boolean; 
  isThermal: boolean; 
  items: typeof invoiceData.items 
}> = ({ isA4, isThermal, items }) => {
  const tableClasses = isA4 
    ? "w-full border border-gray-200 rounded-lg overflow-hidden" 
    : "w-full";
  
  const headerClasses = isA4 
    ? "bg-gray-50 border-b border-gray-200" 
    : "border-b border-dashed border-gray-400";
  
  const cellClasses = isA4 
    ? "px-3 py-2 text-sm border-r border-gray-200 last:border-r-0" 
    : "px-1 py-0.5 text-xs";

  return (
    <div className="mb-6">
      <h3 className={`font-semibold text-gray-900 mb-3 ${isThermal ? 'text-center text-xs' : ''}`}>
        Items
      </h3>
      <table className={tableClasses}>
        <thead className={headerClasses}>
          <tr>
            <th className={`${cellClasses} text-left font-semibold`}>#</th>
            <th className={`${cellClasses} text-left font-semibold`}>Item</th>
            <th className={`${cellClasses} text-center font-semibold`}>Qty</th>
            <th className={`${cellClasses} text-center font-semibold`}>Unit</th>
            <th className={`${cellClasses} text-right font-semibold`}>Rate</th>
            <th className={`${cellClasses} text-right font-semibold`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={isA4 ? "hover:bg-gray-50" : ""}>
              <td className={`${cellClasses} ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                {index + 1}
              </td>
              <td className={`${cellClasses} font-medium ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                {item.name}
              </td>
              <td className={`${cellClasses} text-center ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                {item.qty}
              </td>
              <td className={`${cellClasses} text-center ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                {item.unit}
              </td>
              <td className={`${cellClasses} text-right ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                PKR {item.rate}
              </td>
              <td className={`${cellClasses} text-right font-semibold ${isThermal ? 'border-b border-dashed border-gray-300' : ''}`}>
                PKR {item.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Invoice Summary Component
const InvoiceSummary: React.FC<{ 
  isA4: boolean; 
  isThermal: boolean; 
  data: typeof invoiceData;
  totals: ReturnType<typeof calculateTotals>;
}> = ({ isA4, isThermal, data, totals }) => {
  if (isThermal) {
    return (
      <div className="border-t border-dashed border-gray-400 pt-2 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>PKR {totals.subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount:</span>
          <span>-PKR {data.discount}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>+PKR {data.tax}</span>
        </div>
        <div className="border-t border-dashed border-gray-400 pt-1 flex justify-between font-bold">
          <span>Total:</span>
          <span>PKR {totals.grandTotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance:</span>
          <span>PKR {Math.max(0, totals.balance).toFixed(2)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Method:</span>
            <span>{data.paymentType}</span>
          </div>
          <div className="flex justify-between">
            <span>Received:</span>
            <span className="text-green-600 font-semibold">PKR {data.received}</span>
          </div>
        </div>
      </div>
      <div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>PKR {totals.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span className="text-red-600">-PKR {data.discount}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span className="text-blue-600">+PKR {data.tax}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
            <span>Total:</span>
            <span>PKR {totals.grandTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Balance:</span>
            <span className="text-red-600 font-semibold">
              PKR {Math.max(0, totals.balance).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Invoice Component with auto page breaks
const InvoiceContent: React.FC<{ size: keyof typeof PAPER_SIZES }> = ({ size }) => {
  const { width, height } = PAPER_SIZES[size];
  const isA4 = size === 'A4';
  const isThermal = size === 'Thermal';
  const totals = calculateTotals(invoiceData.items);
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const [needsMultiplePages, setNeedsMultiplePages] = useState(false);

  const containerStyle = {
    width: mmToPx(width),
    minHeight: mmToPx(height),
    fontFamily: isThermal ? 'monospace' : 'system-ui',
    fontSize: isThermal ? '11px' : '14px',
  };

  // Check if content overflows
  useEffect(() => {
    if (contentRef && isA4) {
      const contentHeight = contentRef.scrollHeight;
      const containerHeight = mmToPx(height);
      setNeedsMultiplePages(contentHeight > containerHeight);
    }
  }, [contentRef, height, isA4]);

  // If content fits in one page, show single page
  if (!needsMultiplePages || isThermal) {
    return (
      <div 
        className={`bg-white mx-auto ${isA4 ? 'shadow-lg rounded-lg border' : 'border border-dashed border-gray-300'} print:shadow-none print:border-0 print:rounded-none mb-8`}
        style={containerStyle}
        ref={setContentRef}
      >
        <div className={`${isA4 ? 'p-6' : 'p-2'} h-full`}>
          <InvoiceHeader isA4={isA4} isThermal={isThermal} data={invoiceData} />
          <CustomerDetails isA4={isA4} isThermal={isThermal} data={invoiceData} totals={totals} />
          <ItemsTable isA4={isA4} isThermal={isThermal} items={invoiceData.items} />
          <InvoiceSummary isA4={isA4} isThermal={isThermal} data={invoiceData} totals={totals} />
          
          {invoiceData.description && (
            <div className={`${isA4 ? 'mt-6 pt-6 border-t border-gray-200' : 'mt-2 pt-2 border-t border-dashed border-gray-400'}`}>
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className={`text-gray-700 ${isThermal ? 'text-xs' : 'text-sm'}`}>
                {invoiceData.description}
              </p>
            </div>
          )}
          
          <div className={`text-center ${isA4 ? 'mt-6 pt-6 border-t border-gray-200' : 'mt-2 pt-2 border-t border-dashed border-gray-400'}`}>
            <div className={`font-semibold text-green-600 ${isThermal ? 'text-xs' : 'text-base'}`}>
              Thank you for your business!
            </div>
            <div className={`text-gray-500 mt-1 ${isThermal ? 'text-xs' : 'text-sm'}`}>
              Please visit again!
            </div>
            <div className={`text-gray-400 mt-2 ${isThermal ? 'text-xs' : 'text-xs'}`}>
              This is a computer-generated invoice.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple pages for A4 when content overflows
  const itemsPerPage = 12; // Increased items per page
  const firstPageItems = invoiceData.items.slice(0, itemsPerPage);
  const remainingItems = invoiceData.items.slice(itemsPerPage);
  
  return (
    <div className="space-y-8">
      {/* Page 1 */}
      <div 
        className="bg-white mx-auto shadow-lg rounded-lg border print:shadow-none print:border-0 print:rounded-none"
        style={containerStyle}
      >
        <div className="p-6 h-full">
          <InvoiceHeader isA4={isA4} isThermal={isThermal} data={invoiceData} />
          <CustomerDetails isA4={isA4} isThermal={isThermal} data={invoiceData} totals={totals} />
          <ItemsTable isA4={isA4} isThermal={isThermal} items={firstPageItems} />
        </div>
      </div>

      {/* Page 2 */}
      <div 
        className="bg-white mx-auto shadow-lg rounded-lg border print:shadow-none print:border-0 print:rounded-none"
        style={containerStyle}
      >
        <div className="p-6 h-full">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Items (Continued)</h3>
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-sm text-left font-semibold">#</th>
                  <th className="px-2 py-2 text-sm text-left font-semibold">Item</th>
                  <th className="px-2 py-2 text-sm text-center font-semibold">Qty</th>
                  <th className="px-2 py-2 text-sm text-center font-semibold">Unit</th>
                  <th className="px-2 py-2 text-sm text-right font-semibold">Rate</th>
                  <th className="px-2 py-2 text-sm text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {remainingItems.map((item, index) => (
                  <tr key={itemsPerPage + index} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-sm">{itemsPerPage + index + 1}</td>
                    <td className="px-2 py-2 text-sm font-medium">{item.name}</td>
                    <td className="px-2 py-2 text-sm text-center">{item.qty}</td>
                    <td className="px-2 py-2 text-sm text-center">{item.unit}</td>
                    <td className="px-2 py-2 text-sm text-right">PKR {item.rate}</td>
                    <td className="px-2 py-2 text-sm text-right font-semibold">PKR {item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InvoiceSummary isA4={isA4} isThermal={isThermal} data={invoiceData} totals={totals} />
          
          {invoiceData.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 text-sm">{invoiceData.description}</p>
            </div>
          )}
          
          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <div className="font-semibold text-green-600 text-base">
              Thank you for your business!
            </div>
            <div className="text-gray-500 mt-1 text-sm">
              Please visit again!
            </div>
            <div className="text-gray-400 mt-2 text-xs">
              This is a computer-generated invoice.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Control Panel Component
const ControlPanel: React.FC<{
  selectedSize: keyof typeof PAPER_SIZES;
  onSizeChange: (size: keyof typeof PAPER_SIZES) => void;
  onPrint: () => void;
}> = ({ selectedSize, onSizeChange, onPrint }) => (
  <div className="w-full md:w-80 bg-white rounded-xl shadow-lg border p-6 print:hidden">
    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      <FileText className="w-5 h-5" />
      Print Options
    </h2>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paper Size
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(PAPER_SIZES).map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size as keyof typeof PAPER_SIZES)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedSize === size
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      
      <button
        onClick={onPrint}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-105"
      >
        <Printer className="w-4 h-4" />
        Print Invoice
      </button>
    </div>
  </div>
);

// Main Component
const InvoicePage: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<keyof typeof PAPER_SIZES>('A4');

  const handlePrint = () => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .invoice-print-area, .invoice-print-area * { visibility: visible; }
        .invoice-print-area { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          height: 100%; 
        }
      }
      @page { 
        size: ${selectedSize === 'A4' ? 'A4' : '80mm 200mm'}; 
        margin: 0; 
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      document.head.removeChild(style);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 invoice-print-area">
            <InvoiceContent size={selectedSize} />
          </div>
          <ControlPanel 
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;