'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import QRCode from 'react-qr-code';
import { getSaleById } from '../../../../../http/sales';

type Item = {
  name: string
  qty: number
  rate: number
  amount: number
}

type InvoiceData = {
  id: string | number
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  invoiceAmount: string
  received: string
  items: Item[]
  balance: string
  businessId: string
  createdAt: string
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      setLoading(true);
      try {
        const token =
          (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
        const result = await getSaleById(saleId, token);
        if (result.success && result.sale) {
          setSale(result.sale);
        } else {
          setError(result.message || 'Sale not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch sale');
      }
      setLoading(false);
    };
    if (saleId) fetchSale();
  }, [saleId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!sale) return <div className="min-h-screen flex items-center justify-center">No sale found.</div>;

  // Map sale fields to invoice fields for rendering
  const invoice = {
    id: sale._id,
    invoiceNumber: sale.invoiceNo,
    invoiceDate: sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-GB') : '',
    customerName: sale.partyName,
    customerPhone: sale.phoneNo || '',
    description: sale.description || '',
    imageUrl: sale.imageUrl || '',
    invoiceAmount: sale.grandTotal?.toFixed(2) || '0.00',
    received: sale.paymentType === 'Cash' ? sale.grandTotal?.toFixed(2) : '0.00',
    items: Array.isArray(sale.items)
      ? sale.items.map((item: any) => ({
          name: item.item,
          qty: item.qty,
          unit: item.unit,
          customUnit: item.customUnit,
          rate: item.price,
          amount: item.amount,
        }))
      : [],
    discount: sale.discount || '',
    discountType: sale.discountType || '%',
    discountValue: sale.discountValue || 0,
    tax: sale.tax || '',
    taxType: sale.taxType || '%',
    taxValue: sale.taxValue || 0,
    paymentType: sale.paymentType || '',
    balance: sale.paymentType === 'Credit' ? sale.grandTotal?.toFixed(2) : '0.00',
    businessId: sale.userId,
    createdAt: sale.createdAt,
  };

  const handlePrint = async () => {
    const printJS = (await import('print-js')).default;
    printJS({
      printable: 'invoice-content',
      type: 'html',
      targetStyles: ['*'],
      header: ''
    });
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoice.invoiceNumber}`,
          text: `Invoice for ${invoice.customerName} - Amount: PKR${invoice.invoiceAmount}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Invoice link copied to clipboard!')
    }
  }

  const handleNewSale = () => {
    router.push('/dashboard/sale')
  }

  const handleBackToSales = () => {
    router.push('/dashboard/sales')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Actions - Hidden during print */}
      <div className="print:hidden bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBackToSales}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                ← Back to Sales
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</h1>
                <p className="text-xs text-gray-500">Created on {invoice.invoiceDate}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleShare}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center space-x-1"
              >
                <span>📤</span>
                <span>Share</span>
              </button>
              <button 
                onClick={handlePrint}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1"
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>
              <button 
                onClick={handleNewSale}
                className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 flex items-center space-x-1"
              >
                <span>➕</span>
                <span>New Sale</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div id="invoice-content" className="max-w-3xl mx-auto p-2 sm:p-4 lg:p-6">
        <style>{`
          @media print {
            html, body, #invoice-content {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box;
            }
            #invoice-content {
              border: 1px solid #e5e7eb !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              width: 210mm !important;
              height: 297mm !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              box-sizing: border-box !important;
              background: #fff !important;
            }
            .invoice-inner {
              width: 100% !important;
              height: 100% !important;
              padding: 12mm !important;
              box-sizing: border-box !important;
              background: #fff !important;
            }
            .invoice-inner > * {
              margin-bottom: 12px !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }
            th, td {
              padding: 6px 4px !important;
              word-break: break-word !important;
              font-size: 12px !important;
              border: 1px solid #e5e7eb !important;
            }
            .no-print { display: none !important; }
            @page {
              size: A4;
              margin: 0;
            }
          }
        `}</style>
        <div className="invoice-inner">
          <div className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none border print:border-0">
            {/* Enhanced Invoice Header - Compact */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 border-b gap-4">
              <div className="flex flex-row items-center gap-4 w-full sm:w-auto">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  {/* Logo or Avatar */}
                  <span className="text-3xl">🏢</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Your Company Name</h1>
                  <div className="text-xs text-gray-400">Invoice ID: {invoice.invoiceNumber}</div>
                  <div className="text-xs text-gray-500">Business XYZ, 123 Main St, City, Country</div>
                  <div className="text-xs text-gray-500">Phone: +92-300-0000000 | Email: info@company.com</div>
                </div>
              </div>
              <div className="flex flex-col items-center w-full sm:w-auto">
                <QRCode value={typeof window !== 'undefined' ? window.location.href : ''} size={64} />
                <div className="text-xs text-gray-500 mt-1">Scan to view online</div>
              </div>
            </div>

            {/* Customer & Invoice Details Side by Side */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 border-b">
              <div className="flex-1 min-w-[180px]">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Customer</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold text-gray-900">{invoice.customerName}</p>
                  {invoice.customerPhone && <p className="text-gray-600 text-xs">Phone: {invoice.customerPhone}</p>}
                  <p className="text-gray-600 text-xs">Customer Address, City, State</p>
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Invoice Details</h3>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Invoice #:</span>
                    <span className="font-semibold">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Date:</span>
                    <span>{invoice.invoiceDate}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Payment Type:</span>
                    <span className="font-semibold">{invoice.paymentType}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Status:</span>
                    <span className={`font-semibold ${parseFloat(invoice.balance) === 0 ? 'text-green-700' : 'text-yellow-700'}`}>{parseFloat(invoice.balance) === 0 ? 'Paid' : 'Partial'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Due:</span>
                    <span className="font-semibold text-red-600">PKR {invoice.balance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Image (if any) */}
            {invoice.imageUrl && (
              <div className="flex justify-center py-4">
                <img src={invoice.imageUrl} alt="Uploaded" className="max-h-40 rounded-lg border border-gray-200 shadow" />
              </div>
            )}

            {/* Items Table - Compact */}
            <div className="p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">#</th>
                      <th className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Item Name</th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-900">Qty</th>
                      <th className="border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-900">Unit</th>
                      <th className="border-r border-gray-200 px-2 py-2 text-right font-semibold text-gray-900">Rate (PKR)</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-900">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border-r border-gray-200 px-2 py-2 text-gray-900">{index + 1}</td>
                        <td className="border-r border-gray-200 px-2 py-2 font-medium text-gray-900">{item.name}</td>
                        <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-900">{item.qty}</td>
                        <td className="border-r border-gray-200 px-2 py-2 text-center text-gray-900">{item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit}</td>
                        <td className="border-r border-gray-200 px-2 py-2 text-right text-gray-900">PKR {item.rate}</td>
                        <td className="px-2 py-2 text-right font-semibold text-gray-900">PKR {item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary & Totals Side by Side */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 sm:p-6 border-t bg-gray-50">
              <div className="flex-1 min-w-[180px]">
                <h4 className="font-semibold text-gray-900 mb-1">Payment Summary</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Mode:</span>
                    <span className="font-medium">{invoice.paymentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Received:</span>
                    <span className="font-medium text-green-600">PKR {invoice.received}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">PKR {Number(invoice.invoiceAmount) + Number(invoice.discountValue) - Number(invoice.taxValue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">- PKR {Number(invoice.discountValue).toFixed(2)} {invoice.discountType === '%' ? `(${invoice.discount}%)` : invoice.discountType === 'PKR' ? '' : ''}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium text-blue-600">+ PKR {Number(invoice.taxValue).toFixed(2)} {invoice.taxType === '%' ? `(${invoice.tax}%)` : invoice.taxType === 'PKR' ? '' : ''}</span>
                  </div>
                  <div className="border-t pt-2 mt-1">
                    <div className="flex justify-between text-base font-bold">
                      <span>Total:</span>
                      <span>PKR {invoice.invoiceAmount}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="font-semibold text-red-600">PKR {invoice.balance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description/Notes (if any) */}
            {invoice.description && (
              <div className="p-4 sm:p-6 border-t">
                <h4 className="font-semibold text-gray-900 mb-1">Description / Notes</h4>
                <div className="text-sm text-gray-700 whitespace-pre-line">{invoice.description}</div>
              </div>
            )}

            {/* Thank You Note and Payment Instructions - Compact */}
            <div className="p-4 sm:p-6 border-t text-center">
              <div className="text-base font-semibold text-green-700 mb-1">Thank you for your business!</div>
              <div className="text-xs text-gray-500 mb-1">Please make the payment by the due date to avoid any late fees.</div>
              <div className="text-xs text-gray-400">This is a computer-generated invoice and does not require a signature.</div>
              <div className="text-xs text-gray-400 mt-2">Prepared by: Your Name</div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Print Hidden */}
        <div className="no-print mt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={handleNewSale}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-1"
          >
            <span>➕</span>
            <span>Create New Sale</span>
          </button>
          <button 
            onClick={handleBackToSales}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center space-x-1"
          >
            <span>📋</span>
            <span>View All Sales</span>
          </button>
        </div>
      </div>
    </div>
  )
}

