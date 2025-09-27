"use client";
import React, { useRef, useState, useEffect, Suspense } from "react";
import { QrCode, FileText, Printer, ArrowLeft, Wifi, Usb } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSaleById } from "../../../http/sales";
import { getQuotationsForUser } from "../../../http/quotations";
import { jwtDecode } from "jwt-decode";

// Constants
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Thermal: { width: 80, height: 200 },
} as const;

const mmToPx = (mm: number) => mm * 3.78;

// Thermal Printer Interface
interface ThermalPrinter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  print(text: string): Promise<void>;
  cut(): Promise<void>;
  feed(lines?: number): Promise<void>;
  align(alignment: 'left' | 'center' | 'right'): Promise<void>;
  bold(enabled: boolean): Promise<void>;
  size(size: 'small' | 'normal' | 'large'): Promise<void>;
}

// Web-based Thermal Printer Implementation
class WebThermalPrinter implements ThermalPrinter {
  private port: any = null;
  private writer: any = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      if ('serial' in navigator) {
        // Web Serial API
        this.port = await (navigator as any).serial.requestPort();
        if (!this.port) {
          throw new Error('No printer selected. Please select a thermal printer from the list.');
        }
        await this.port.open({ baudRate: 9600 });
        this.writer = this.port.writable.getWriter();
        this.isConnected = true;
      } else if ('usb' in navigator) {
        // WebUSB API
        const device = await (navigator as any).usb.requestDevice({
          filters: [{ classCode: 7 }] // Printer class
        });
        if (!device) {
          throw new Error('No printer selected. Please select a thermal printer from the list.');
        }
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        this.isConnected = true;
      } else {
        throw new Error('Web Serial or WebUSB not supported in this browser. Please use Chrome or Edge for thermal printing.');
      }
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          throw new Error('No thermal printer selected. Please connect a thermal printer and try again.');
        } else if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied. Please allow access to the thermal printer.');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('Thermal printing not supported. Please use Chrome or Edge browser.');
        }
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      await this.writer.releaseLock();
    }
    if (this.port) {
      await this.port.close();
    }
    this.isConnected = false;
  }

  async print(text: string): Promise<void> {
    if (!this.isConnected) throw new Error('Printer not connected');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    if (this.writer) {
      await this.writer.write(data);
    }
  }

  async cut(): Promise<void> {
    await this.print('\x1D\x56\x00'); // ESC/POS cut command
  }

  async feed(lines: number = 3): Promise<void> {
    await this.print('\n'.repeat(lines));
  }

  async align(alignment: 'left' | 'center' | 'right'): Promise<void> {
    const commands = {
      left: '\x1B\x61\x00',
      center: '\x1B\x61\x01',
      right: '\x1B\x61\x02'
    };
    await this.print(commands[alignment]);
  }

  async bold(enabled: boolean): Promise<void> {
    const command = enabled ? '\x1B\x45\x01' : '\x1B\x45\x00';
    await this.print(command);
  }

  async size(size: 'small' | 'normal' | 'large'): Promise<void> {
    const commands = {
      small: '\x1B\x21\x00',
      normal: '\x1B\x21\x00',
      large: '\x1B\x21\x11'
    };
    await this.print(commands[size]);
  }
}

// Default sample data - will be overridden by real data
const defaultInvoiceData = {
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
    { name: "Rice - Basmati 1kg", qty: 5, unit: "kg", rate: 250, amount: 1250, discountPercentage: null, discountAmount: null },
    { name: "Sugar - 2kg", qty: 2, unit: "kg", rate: 180, amount: 360, discountPercentage: null, discountAmount: null },
    { name: "Cooking Oil 1L", qty: 3, unit: "ltr", rate: 500, amount: 1500, discountPercentage: null, discountAmount: null },
    { name: "Tea Pack", qty: 1, unit: "box", rate: 800, amount: 800, discountPercentage: null, discountAmount: null },
    { name: "Wheat Flour - 5kg", qty: 2, unit: "kg", rate: 400, amount: 800, discountPercentage: null, discountAmount: null },
    { name: "Red Lentils - 1kg", qty: 3, unit: "kg", rate: 200, amount: 600, discountPercentage: null, discountAmount: null },
    { name: "Chicken - Fresh 1kg", qty: 2, unit: "kg", rate: 600, amount: 1200, discountPercentage: null, discountAmount: null },
    { name: "Tomatoes - Fresh 1kg", qty: 4, unit: "kg", rate: 80, amount: 320, discountPercentage: null, discountAmount: null },
    { name: "Onions - Red 1kg", qty: 3, unit: "kg", rate: 60, amount: 180, discountPercentage: null, discountAmount: null },
    { name: "Potatoes - Fresh 1kg", qty: 5, unit: "kg", rate: 40, amount: 200, discountPercentage: null, discountAmount: null },
    { name: "Milk - 1 Liter", qty: 2, unit: "ltr", rate: 120, amount: 240, discountPercentage: null, discountAmount: null },
    { name: "Bread - Whole Wheat", qty: 3, unit: "pcs", rate: 80, amount: 240, discountPercentage: null, discountAmount: null },
  ],
  discount: 200,
  tax: 100,
  paymentType: "Cash",
  received: "8500.00",
  description: "Thank you for your business! Please pay by the due date.",
  qrUrl: "https://deveasedigital.com/invoice/INV-0001",
};

// Utility functions
const calculateTotals = (items: typeof defaultInvoiceData.items, discount: number, tax: number, received: string) => {
  const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
  const grandTotal = subtotal - discount + tax;
  const balance = grandTotal - parseFloat(received);
  return { subtotal, grandTotal, balance };
};

// Thermal Printing Function
const printThermalInvoice = async (data: typeof defaultInvoiceData) => {
  const printer = new WebThermalPrinter();
  
  try {
    // Show connection dialog
    alert('Please select your thermal printer from the device list that appears.');
    
    await printer.connect();
    
    // Show printing progress
    alert('Connecting to printer... Please wait.');
    
    // Header
    await printer.align('center');
    await printer.bold(true);
    await printer.size('large');
    await printer.print(data.business.name + '\n');
    await printer.bold(false);
    await printer.size('normal');
    await printer.feed(1);
    
    // Invoice details
    await printer.align('left');
    await printer.print('Invoice: ' + data.invoiceNumber + '\n');
    await printer.print('Date: ' + data.invoiceDate + '\n');
    await printer.print('Customer: ' + data.customer.name + '\n');
    await printer.print('Phone: ' + data.customer.phone + '\n');
    await printer.print('--------------------------------\n');
    
    // Items header
    await printer.print('Item                Qty  Rate  Amount\n');
    await printer.print('--------------------------------\n');
    
    // Items
    for (const item of data.items) {
      const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
      const line = `${itemName.padEnd(18)} ${item.qty.toString().padStart(2)} ${item.rate.toString().padStart(4)} ${item.amount.toString().padStart(6)}\n`;
      await printer.print(line);
    }
    
    await printer.print('--------------------------------\n');
    
    // Totals
    const totals = calculateTotals(data.items, data.discount, data.tax, data.received);
    await printer.print(`Subtotal:           ${totals.subtotal.toString().padStart(10)}\n`);
    await printer.print(`Discount:           -${data.discount.toString().padStart(9)}\n`);
    await printer.print(`Tax:                +${data.tax.toString().padStart(9)}\n`);
    await printer.print('--------------------------------\n');
    await printer.bold(true);
    await printer.print(`Total:              ${totals.grandTotal.toString().padStart(10)}\n`);
    await printer.bold(false);
    
    // Payment info
    await printer.print(`Payment: ${data.paymentType}\n`);
    if (data.paymentType === 'Credit') {
      await printer.print(`Received: ${data.received}\n`);
      await printer.print(`Balance: ${Math.max(0, totals.balance).toFixed(2)}\n`);
    }
    
    await printer.feed(2);
    await printer.align('center');
    await printer.print('Thank you for your business!\n');
    await printer.print('Please visit again!\n');
    await printer.feed(1);
    await printer.cut();
    
    alert('✅ Invoice printed successfully!');
    
  } catch (error) {
    console.error('Print failed:', error);
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('No thermal printer selected')) {
        errorMessage = '❌ No printer selected. Please connect a thermal printer and try again.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = '❌ Permission denied. Please allow browser access to the thermal printer.';
      } else if (error.message.includes('not supported')) {
        errorMessage = '❌ Thermal printing not supported. Please use Chrome or Edge browser.';
      } else {
        errorMessage = '❌ ' + error.message;
      }
    }
    
    alert(errorMessage);
  } finally {
    try {
      await printer.disconnect();
    } catch (e) {
      console.error('Error disconnecting printer:', e);
    }
  }
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
  data: typeof defaultInvoiceData 
}> = ({ isA4, isThermal, data }) => {
  if (isThermal) {
    return (
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h1 className="text-sm font-bold tracking-wider uppercase">{data.business.name}</h1>
        <div className="text-xs mt-1">
          {data.invoiceNumber && <div>Invoice: {data.invoiceNumber}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.business.name}</h1>
        {data.invoiceNumber && <p className="text-sm text-gray-600">Invoice #{data.invoiceNumber}</p>}
        {data.business.address && (
          <p className="text-sm text-gray-500">{data.business.address}</p>
        )}
        {(data.business.phone || data.business.email) && (
          <p className="text-sm text-gray-500">
            {data.business.phone && data.business.email ? `${data.business.phone} | ${data.business.email}` : 
             data.business.phone || data.business.email}
          </p>
        )}
      </div>
    </div>
  );
};

// Customer Details Component
const CustomerDetails: React.FC<{ 
  isA4: boolean; 
  isThermal: boolean;
  data: typeof defaultInvoiceData;
  totals: ReturnType<typeof calculateTotals>;
}> = ({ isA4, isThermal, data, totals }) => {
  if (isThermal) {
    return (
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-xs">
        <div className="text-center font-bold mb-1">CUSTOMER</div>
        <div>Name: {data.customer.name}</div>
        <div>Phone: {data.customer.phone}</div>
        <div className="border-t border-dashed border-gray-300 mt-1 pt-1">
          <div className="text-center font-bold mb-1">INVOICE DETAILS</div>
          <div>Date & Time: {data.invoiceDate}</div>
          <div>Payment: {data.paymentType}</div>
          <div>Status: {totals.balance <= 0 ? 'Paid' : 'Pending'}</div>
        </div>
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
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Invoice Details</h3>
        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Date & Time:</span>
            <span>{data.invoiceDate}</span>
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
  items: typeof defaultInvoiceData.items 
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
  data: typeof defaultInvoiceData;
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
        {/* Show Received and Balance only for Credit payments */}
        {data.paymentType === 'Credit' && (
          <>
            <div className="flex justify-between">
              <span>Received:</span>
              <span>PKR {data.received}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance:</span>
              <span>PKR {Math.max(0, totals.balance).toFixed(2)}</span>
            </div>
          </>
        )}
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
          {/* Show Received only for Credit payments */}
          {data.paymentType === 'Credit' && (
            <div className="flex justify-between">
              <span>Received:</span>
              <span className="text-green-600 font-semibold">PKR {data.received}</span>
            </div>
          )}
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
          {/* Show Balance only for Credit payments */}
          {data.paymentType === 'Credit' && (
            <div className="flex justify-between">
              <span>Balance:</span>
              <span className="text-red-600 font-semibold">
                PKR {Math.max(0, totals.balance).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Invoice Component (like estimate format)
const SimpleInvoiceContent: React.FC<{ data: typeof defaultInvoiceData }> = ({ data }) => {
  // Function to convert number to words (simple version)
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    return 'Large Number';
  };

  const totals = calculateTotals(data.items, data.discount, data.tax, data.received);

  return (
    <div className="bg-white p-4 w-full" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Section */}
      <div className="mb-2">
            <h1 className="text-2xl font-bold text-black mb-1 text-center">
              {(() => {
                const invoiceNo = data.invoiceNumber;
                const isFromQuotation = invoiceNo && (
                  invoiceNo.includes('QUO') || 
                  invoiceNo.includes('QUOT') || 
                  invoiceNo.includes('QT') ||
                  invoiceNo.startsWith('QT')
                );
                return isFromQuotation ? 'Estimate' : 'Invoice';
              })()}
            </h1>
        <div className="text-lg font-bold text-black ml-4">{data.business.name}</div>
      </div>

      {/* Invoice Details Section */}
      <div className="border border-gray-300 mb-2">
        <div className="flex">
          {/* Left Side - Customer */}
          <div className="flex-1 p-2 border-r border-gray-300">
            <div className="text-xs text-gray-700">Bill To:</div>
            <div className="text-sm font-semibold text-black">{data.customer.name}</div>
            <div className="text-xs text-gray-700">Phone: {data.business.phone || '3054561515'}</div>
          </div>
          
          {/* Right Side - Details */}
          <div className="flex-1 p-2">
                <div className="text-xs text-gray-700">
                  {(() => {
                    const invoiceNo = data.invoiceNumber;
                    const isFromQuotation = invoiceNo && (
                      invoiceNo.includes('QUO') || 
                      invoiceNo.includes('QUOT') || 
                      invoiceNo.includes('QT') ||
                      invoiceNo.startsWith('QT')
                    );
                    return isFromQuotation ? 'Estimate Details:' : 'Invoice Details:';
                  })()}
                </div>
                <div className="text-xs text-black">No: {data.invoiceNumber}</div>
                <div className="text-xs text-black">Date: {data.invoiceDate}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-gray-300 mb-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="border-r border-gray-300 px-1 py-1 text-left text-xs font-semibold text-black">#</th>
              <th className="border-r border-gray-300 px-1 py-1 text-left text-xs font-semibold text-black">Item name</th>
              <th className="border-r border-gray-300 px-1 py-1 text-center text-xs font-semibold text-black">Quantity</th>
              <th className="border-r border-gray-300 px-1 py-1 text-right text-xs font-semibold text-black">Price/ Unit(Rs)</th>
              {(() => {
                const hasAnyItemDiscount = data.items.some((item: any) => 
                  (item.discountPercentage && item.discountPercentage > 0) || 
                  (item.discountAmount && item.discountAmount > 0)
                );
                return hasAnyItemDiscount ? (
                  <th className="border-r border-gray-300 px-1 py-1 text-right text-xs font-semibold text-black">Discount</th>
                ) : null;
              })()}
              <th className="px-1 py-1 text-right text-xs font-semibold text-black">Amount(Rs)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => {
              const itemDiscount = (item as any).discountPercentage ? 
                (item.rate * item.qty * (item as any).discountPercentage / 100) : 
                ((item as any).discountAmount || 0);
              const finalAmount = (item.rate * item.qty) - itemDiscount;
              
              const hasAnyItemDiscount = data.items.some((item: any) => 
                (item.discountPercentage && item.discountPercentage > 0) || 
                (item.discountAmount && item.discountAmount > 0)
              );
              
              return (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 px-1 py-1 text-xs text-black">{idx + 1}</td>
                  <td className="border-r border-gray-300 px-1 py-1 text-xs text-black">{item.name}</td>
                  <td className="border-r border-gray-300 px-1 py-1 text-xs text-black text-center">{item.qty}</td>
                  <td className="border-r border-gray-300 px-1 py-1 text-xs text-black text-right">Rs {item.rate.toLocaleString()}</td>
                  {hasAnyItemDiscount && (
                    <td className="border-r border-gray-300 px-1 py-1 text-xs text-black text-right">
                      {itemDiscount > 0 ? (
                        <>
                          Rs {itemDiscount.toFixed(2)}
                          {(item as any).discountPercentage && (
                            <span className="text-gray-500"> ({(item as any).discountPercentage}%)</span>
                          )}
                        </>
                      ) : '-'}
                    </td>
                  )}
                  <td className="px-1 py-1 text-xs text-black text-right">Rs {finalAmount.toFixed(2)}</td>
                </tr>
              );
            })}
            
            {/* Total Row */}
            <tr className="border-b border-gray-300">
              <td className="border-r border-gray-300 px-1 py-1"></td>
              <td className="border-r border-gray-300 px-1 py-1 text-xs font-semibold text-black">Total</td>
              <td className="border-r border-gray-300 px-1 py-1 text-xs font-semibold text-black text-center">
                {data.items.reduce((sum, item) => sum + item.qty, 0)}
              </td>
              <td className="border-r border-gray-300 px-1 py-1"></td>
              {(() => {
                const hasAnyItemDiscount = data.items.some((item: any) => 
                  (item.discountPercentage && item.discountPercentage > 0) || 
                  (item.discountAmount && item.discountAmount > 0)
                );
                return hasAnyItemDiscount ? (
                  <td className="border-r border-gray-300 px-1 py-1 text-xs font-semibold text-black text-right">
                    Rs {data.items.reduce((sum, item) => {
                      const itemDiscount = (item as any).discountPercentage ? 
                        (item.rate * item.qty * (item as any).discountPercentage / 100) : 
                        ((item as any).discountAmount || 0);
                      return sum + itemDiscount;
                    }, 0).toFixed(2)}
                  </td>
                ) : null;
              })()}
              <td className="px-1 py-1 text-xs font-semibold text-black text-right">
                Rs {data.items.reduce((sum, item) => {
                  const itemDiscount = (item as any).discountPercentage ? 
                    (item.rate * item.qty * (item as any).discountPercentage / 100) : 
                    ((item as any).discountAmount || 0);
                  const finalAmount = (item.rate * item.qty) - itemDiscount;
                  return sum + finalAmount;
                }, 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="mb-2">
        {(() => {
          const totalItemDiscount = data.items.reduce((sum, item) => {
            const itemDiscount = (item as any).discountPercentage ? 
              (item.rate * item.qty * (item as any).discountPercentage / 100) : 
              ((item as any).discountAmount || 0);
            return sum + itemDiscount;
          }, 0);
          
          const totalAfterItemDiscount = data.items.reduce((sum, item) => {
            const itemDiscount = (item as any).discountPercentage ? 
              (item.rate * item.qty * (item as any).discountPercentage / 100) : 
              ((item as any).discountAmount || 0);
            const finalAmount = (item.rate * item.qty) - itemDiscount;
            return sum + finalAmount;
          }, 0);
          
          const finalTotal = totalAfterItemDiscount + data.tax - data.discount;
          
          return (
            <>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-black">Sub Total:</span>
                <span className="text-xs text-black">Rs {data.items.reduce((sum, item) => sum + (item.rate * item.qty), 0).toFixed(2)}</span>
              </div>
              
              {data.discount > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-black">Discount:</span>
                  <span className="text-xs text-black">- Rs {data.discount.toFixed(2)}</span>
                </div>
              )}
              
              {data.tax > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-black">Tax:</span>
                  <span className="text-xs text-black">+ Rs {data.tax.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-black">Total:</span>
                <span className="text-xs font-bold text-black">Rs {finalTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-black">Received:</span>
                <span className="text-xs text-black">Rs {data.received}</span>
              </div>
              
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-black">Balance:</span>
                <span className="text-xs text-black">Rs {Math.max(0, finalTotal - parseFloat(data.received)).toFixed(2)}</span>
              </div>
              
              <div className="mt-1">
                  <div className="text-xs text-black">
                    {(() => {
                      const invoiceNo = data.invoiceNumber;
                      const isFromQuotation = invoiceNo && (
                        invoiceNo.includes('QUO') || 
                        invoiceNo.includes('QUOT') || 
                        invoiceNo.includes('QT') ||
                        invoiceNo.startsWith('QT')
                      );
                      return isFromQuotation ? 'Estimate Amount in Words:' : 'Invoice Amount in Words:';
                    })()}
                  </div>
                <div className="text-xs text-black italic">
                  {numberToWords(Math.floor(finalTotal))} Rupees only
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Terms & Conditions */}
      <div className="border border-gray-300 border-dashed p-2 mb-2">
        <div className="text-xs text-black">Terms & Conditions:</div>
        <div className="text-xs text-black">
          {data.description || "Thanks for doing business with us!"}
        </div>
      </div>

      {/* Signature Section */}
      <div className="border border-gray-300 p-2">
        <div className="flex justify-between">
          <div className="flex-1"></div>
          <div className="text-center">
            <div className="text-xs text-black">For {data.business.name}:</div>
            <div className="w-24 h-12 border border-gray-300 mx-auto mb-1"></div>
            <div className="text-xs text-black">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Invoice Component with auto page breaks
const InvoiceContent: React.FC<{ size: keyof typeof PAPER_SIZES; data: typeof defaultInvoiceData }> = ({ size, data }) => {
  const { width, height } = PAPER_SIZES[size];
  const isA4 = size === 'A4';
  const isThermal = size === 'Thermal';
  const totals = calculateTotals(data.items, data.discount, data.tax, data.received);
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
                  <InvoiceHeader isA4={isA4} isThermal={isThermal} data={data} />
        <CustomerDetails isA4={isA4} isThermal={isThermal} data={data} totals={totals} />
        <ItemsTable isA4={isA4} isThermal={isThermal} items={data.items} />
        <InvoiceSummary isA4={isA4} isThermal={isThermal} data={data} totals={totals} />
          
          {data.description && (
            <div className={`${isA4 ? 'mt-6 pt-6 border-t border-gray-200' : 'mt-2 pt-2 border-t border-dashed border-gray-400'}`}>
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className={`text-gray-700 ${isThermal ? 'text-xs' : 'text-sm'}`}>
                {data.description}
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
  const firstPageItems = data.items.slice(0, itemsPerPage);
  const remainingItems = data.items.slice(itemsPerPage);
  
  return (
    <div className="space-y-8">
      {/* Page 1 */}
      <div 
        className="bg-white mx-auto shadow-lg rounded-lg border print:shadow-none print:border-0 print:rounded-none"
        style={containerStyle}
      >
        <div className="p-6 h-full">
          <InvoiceHeader isA4={isA4} isThermal={isThermal} data={data} />
          <CustomerDetails isA4={isA4} isThermal={isThermal} data={data} totals={totals} />
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

          <InvoiceSummary isA4={isA4} isThermal={isThermal} data={data} totals={totals} />
          
          {data.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 text-sm">{data.description}</p>
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
  onThermalPrint: () => void;
  invoiceData: typeof defaultInvoiceData;
  isThermalConnected: boolean;
}> = ({ selectedSize, onSizeChange, onPrint, onThermalPrint, invoiceData, isThermalConnected }) => (
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
      
      {/* Thermal Printer Status */}
      {selectedSize === 'Thermal' && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isThermalConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isThermalConnected ? 'Thermal Printer Ready' : 'Thermal Printer Setup Required'}
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            {isThermalConnected ? (
              <p>Ready to print thermal receipts</p>
            ) : (
              <div>
                <p className="font-medium mb-1">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Connect thermal printer via USB</li>
                  <li>Use Chrome or Edge browser</li>
                  <li>Click print button to select printer</li>
                  <li>Allow browser permission when prompted</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Print Buttons */}
      <div className="space-y-2">
        {selectedSize === 'Thermal' ? (
          <button
            onClick={onThermalPrint}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <Usb className="w-4 h-4" />
            {(() => {
              const invoiceNo = invoiceData.invoiceNumber;
              const isFromQuotation = invoiceNo && (
                invoiceNo.includes('QUO') || 
                invoiceNo.includes('QUOT') || 
                invoiceNo.includes('QT') ||
                invoiceNo.startsWith('QT')
              );
              return isFromQuotation ? 'Print Thermal Estimate' : 'Print Thermal Invoice';
            })()}
          </button>
        ) : (
          <button
            onClick={onPrint}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <Printer className="w-4 h-4" />
            {(() => {
              const invoiceNo = invoiceData.invoiceNumber;
              const isFromQuotation = invoiceNo && (
                invoiceNo.includes('QUO') || 
                invoiceNo.includes('QUOT') || 
                invoiceNo.includes('QT') ||
                invoiceNo.startsWith('QT')
              );
              return isFromQuotation ? 'Print Estimate' : 'Print Invoice';
            })()}
          </button>
        )}
      </div>
    </div>
  </div>
);

// Main Component
const InvoicePageContent: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<keyof typeof PAPER_SIZES>('A4');
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceData);
  const [loading, setLoading] = useState(false);
  const [isThermalConnected, setIsThermalConnected] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Add navigation history manipulation to go back 2 pages
  useEffect(() => {
    // Push an extra entry to the history stack
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (event: PopStateEvent) => {
      // Prevent the default back navigation
      event.preventDefault();
      
      // Determine redirect destination based on invoice number
      const invoiceNo = searchParams.get('invoiceNo');
      const isFromQuotation = invoiceNo && (
        invoiceNo.includes('QUO') || 
        invoiceNo.includes('QUOT') || 
        invoiceNo.includes('QT') ||
        invoiceNo.startsWith('QT')
      );
      
      if (isFromQuotation) {
        // Redirect to quotation page if came from estimate
        router.push('/dashboard/quotation');
      } else {
        // Redirect to sale page if came from sale
        router.push('/dashboard/sale');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router, searchParams]);

  // Fetch sale or quotation data if saleId is provided
  useEffect(() => {
    const fetchData = async () => {
      const saleId = searchParams.get('saleId');
      const invoiceNo = searchParams.get('invoiceNo');
      
      if (saleId) {
        setLoading(true);
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
          
          // Try to fetch as sale first
          let result: any = { success: false, sale: null };
          let dataType = 'sale';
          
          try {
            result = await getSaleById(saleId, token);
            if (result.success && result.sale) {
              dataType = 'sale';
              console.log('Found sale:', result.sale);
            }
          } catch (error) {
            console.log('Sale not found, trying quotation...');
            // If sale API fails, try to fetch as quotation
            try {
              const quotationResult = await getQuotationsForUser(token);
              if (quotationResult.success && quotationResult.data) {
                const quotation = quotationResult.data.find((q: any) => q._id === saleId || q.id === saleId);
                if (quotation) {
                  result = { success: true, sale: quotation };
                  dataType = 'quotation';
                  console.log('Found quotation:', quotation);
                }
              }
            } catch (quotationError) {
              console.error('Error fetching quotation:', quotationError);
            }
          }
          
          if (result.success && result.sale) {
            const sale = result.sale;
            
            // Get business info from token
            const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
            let businessInfo = {
              name: "Devease Digital Pvt Ltd.",
              address: "",
              phone: "",
              email: "",
            };
            
            if (token) {
              try {
                const decoded: any = jwtDecode(token);
                // Use business name from token if available
                if (decoded.name && decoded.name !== decoded.email) {
                  businessInfo.name = decoded.name;
                }
                // You can also add other business fields from token if available
              } catch (error) {
                console.error('Error decoding token:', error);
              }
            }
            
            // Log the sale data to debug discount fields
            console.log('Sale data:', sale);
            console.log('Sale items:', sale.items);
            
            // Transform sale/quotation data to invoice format
            const transformedData = {
              invoiceNumber: invoiceNo || sale.invoiceNo || sale.invoiceNumber || sale.quotationNo || sale.quotationNumber || sale.number || "",
              invoiceDate: (() => {
                // Use actual creation date and time
                if (sale.createdAt) {
                  const date = new Date(sale.createdAt);
                  return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                } else if (sale.invoiceDate) {
                  return sale.invoiceDate;
                } else if (sale.date) {
                  return sale.date;
                } else {
                  // Use current date and time if no creation date available
                  const now = new Date();
                  return now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                }
              })(),
              dueDate: sale.dueDate || "",
              status: (() => {
                // Auto-determine status based on payment type and received amount
                const paymentType = sale.paymentType || "Cash";
                const receivedAmount = parseFloat(sale.receivedAmount?.toString() || "0");
                const grandTotal = sale.grandTotal || sale.amount || 0;
                
                if (paymentType === "Cash") {
                  return "Paid"; // Cash payments are always paid
                } else if (paymentType === "Credit") {
                  if (receivedAmount >= grandTotal) {
                    return "Paid"; // Full amount received
                  } else if (receivedAmount > 0) {
                    return "Partial"; // Partial payment received
                  } else {
                    return "Pending"; // No payment received
                  }
                }
                return sale.status || "Pending";
              })(),
              customer: {
                name: sale.partyName || sale.customerName || sale.customer?.name || sale.customer || "N/A",
                phone: sale.phoneNo || sale.customerPhone || sale.customer?.phone || sale.phone || "N/A",
                address: sale.address || sale.customerAddress || sale.customer?.address || "N/A",
              },
              business: {
                name: businessInfo.name,
                address: sale.businessAddress || "",
                phone: sale.businessPhone || "",
                email: sale.businessEmail || "",
              },
              items: sale.items?.map((item: any) => ({
                name: item.item || item.name || "Item",
                qty: item.qty || 1,
                unit: item.unit || "pcs",
                rate: item.price || item.rate || 0,
                amount: item.amount || 0,
                discountPercentage: item.discountPercentage || null,
                discountAmount: item.discountAmount || null,
              })) || defaultInvoiceData.items,
              discount: sale.discount || 0,
              tax: sale.tax || 0,
              paymentType: sale.paymentType || "Cash",
              received: (() => {
                // Handle different field names for received amount
                if (sale.receivedAmount !== undefined && sale.receivedAmount !== null) {
                  return sale.receivedAmount.toString();
                } else if (sale.received !== undefined && sale.received !== null) {
                  return sale.received.toString();
                } else if (sale.paymentType === 'Cash') {
                  // For cash payments, received amount equals grand total
                  const grandTotal = sale.grandTotal || sale.amount || 0;
                  return grandTotal.toString();
                } else if (dataType === 'quotation') {
                  // For quotations, use amount as received
                  return sale.amount?.toString() || sale.totalAmount?.toString() || "0.00";
                }
                return "0";
              })(),
              description: sale.description || "",
              qrUrl: sale.invoiceNo || sale.invoiceNumber ? `https://deveasedigital.com/invoice/${sale.invoiceNo || sale.invoiceNumber}` : "",
            };
            
            console.log('Transformed data:', transformedData);
            console.log('Transformed items:', transformedData.items);
            
            setInvoiceData(transformedData);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [searchParams]);

  // Check thermal printer availability
  useEffect(() => {
    const checkThermalSupport = () => {
      const hasSerial = 'serial' in navigator;
      const hasUSB = 'usb' in navigator;
      setIsThermalConnected(hasSerial || hasUSB);
    };
    
    checkThermalSupport();
  }, []);

  const handleThermalPrint = async () => {
    try {
      await printThermalInvoice(invoiceData);
    } catch (error) {
      console.error('Thermal print error:', error);
      alert('Thermal printing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

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
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              // Check if we came from quotation page or sale page
              const saleId = searchParams.get('saleId');
              const invoiceNo = searchParams.get('invoiceNo');
              
              // Determine if this is from quotation (estimate) or sale
              const isFromQuotation = invoiceNo && (
                invoiceNo.includes('QUO') || 
                invoiceNo.includes('QUOT') || 
                invoiceNo.includes('QT') ||
                invoiceNo.startsWith('QT')
              );
              
              if (isFromQuotation) {
                // Redirect to quotation page if came from estimate
                router.push('/dashboard/quotation');
              } else {
                // Redirect to sale page if came from sale
                router.push('/dashboard/sale');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {(() => {
              const invoiceNo = searchParams.get('invoiceNo');
              const isFromQuotation = invoiceNo && (
                invoiceNo.includes('QUO') || 
                invoiceNo.includes('QUOT') || 
                invoiceNo.includes('QT') ||
                invoiceNo.startsWith('QT')
              );
              return isFromQuotation ? 'Back to Quotations' : 'Back to Sales';
            })()}
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 invoice-print-area">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Loading estimate data...</div>
              </div>
            ) : selectedSize === 'Thermal' ? (
              <InvoiceContent size={selectedSize} data={invoiceData} />
            ) : (
              <SimpleInvoiceContent data={invoiceData} />
            )}
          </div>
          <ControlPanel 
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            onPrint={handlePrint}
            onThermalPrint={handleThermalPrint}
            invoiceData={invoiceData}
            isThermalConnected={isThermalConnected}
          />
        </div>
      </div>
    </div>
  );
};

const InvoicePage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <InvoicePageContent />
    </Suspense>
  );
};

export default InvoicePage;