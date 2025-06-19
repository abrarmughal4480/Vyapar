'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

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
  // const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const router = useRouter()
  // const params = useParams()

  // useEffect(() => {
  //   const loadInvoiceData = async () => {
  //     try {
  //       setError(null)
        
  //       // Get authentication details
  //       const businessId = localStorage.getItem('businessId') || localStorage.getItem('userId') || 'business123'
  //       const token = localStorage.getItem('token') || localStorage.getItem('authToken')
        
  //       // First try to get from localStorage (for newly created invoices)
  //       const savedInvoice = localStorage.getItem('lastInvoice')
  //       if (savedInvoice) {
  //         const invoiceData = JSON.parse(savedInvoice)
  //         const invoiceId = Array.isArray(params.id) ? params.id[0] : params.id
  //         if (invoiceData.id.toString() === invoiceId) {
  //           setInvoice(invoiceData)
  //           setIsLoading(false)
  //           return
  //         }
  //       }

  //       // Check pending invoices (offline created)
  //       const pendingInvoices = JSON.parse(localStorage.getItem('pendingInvoices') || '[]')
  //       const pendingInvoice = pendingInvoices.find((inv: any) => inv.id.toString() === (Array.isArray(params.id) ? params.id[0] : params.id))
  //       if (pendingInvoice) {
  //         setInvoice(pendingInvoice)
  //         setIsLoading(false)
  //         return
  //       }

  //       if (!token) {
  //         setError('Authentication required. Please login again.')
  //         setIsLoading(false)
  //         return
  //       }

  //       // Fetch from backend with proper error handling
  //       console.log(`🔍 Fetching invoice ${params.id} for business ${businessId}`)
        
  //       // Use environment variable for API base URL
  //       const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  //       const invoiceId = Array.isArray(params.id) ? params.id[0] : params.id
        
  //       // First check if backend is available
  //       try {
  //         const healthCheck = await fetch(`${API_BASE_URL}/api/health`)
  //         if (!healthCheck.ok) {
  //           throw new Error('Backend server not available')
  //         }
  //       } catch (healthError) {
  //         setError('Backend server is not available. Showing local data only.')
  //         setIsLoading(false)
  //         return
  //       }

  //       const response = await fetch(`${API_BASE_URL}/api/sales/${businessId}/invoices/${invoiceId}`, {
  //         method: 'GET',
  //         headers: {
  //           'Authorization': `Bearer ${token}`,
  //           'Content-Type': 'application/json',
  //           'Accept': 'application/json',
  //         },
  //       })

  //       console.log(`📡 Response status: ${response.status}`)

  //       if (!response.ok) {
  //         if (response.status === 401) {
  //           setError('Authentication failed. Please login again.')
  //           localStorage.removeItem('token')
  //           localStorage.removeItem('authToken')
  //           router.push('/login')
  //           return
  //         }
          
  //         if (response.status === 404) {
  //           setError('Invoice not found in backend. It may be a locally created invoice.')
  //           setIsLoading(false)
  //           return
  //         }
          
  //         throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  //       }

  //       const result = await response.json()
  //       console.log('📥 API Response:', result)
        
  //       if (result.success && result.data) {
  //         // Transform API response to match our interface
  //         const transformedInvoice: InvoiceData = {
  //           id: result.data.id || result.data._id,
  //           invoiceNumber: result.data.invoiceNumber,
  //           invoiceDate: result.data.invoiceDate,
  //           customerName: result.data.customerName,
  //           invoiceAmount: result.data.invoiceAmount.toString(),
  //           received: result.data.received.toString(),
  //           items: result.data.items || [],
  //           balance: (result.data.invoiceAmount - result.data.received).toString(),
  //           businessId: result.data.businessId,
  //           createdAt: result.data.createdAt
  //         }
          
  //         setInvoice(transformedInvoice)
  //       } else {
  //         throw new Error(result.message || 'Failed to fetch invoice data')
  //       }
        
  //     } catch (error: any) {
  //       console.error('❌ Error loading invoice:', error)
        
  //       // If error is network related, check for local copies
  //       if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
  //         setError('Network error. Showing local data only. Start backend server to sync.')
  //       } else {
  //         setError(error.message || 'Failed to load invoice. Please try again.')
  //       }
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }

  //   if (params.id) {
  //     loadInvoiceData()
  //   }
  // }, [params.id, router])

  // const handlePrint = () => {
  //   window.print()
  // }

  // const handleShare = async () => {
  //   if (navigator.share) {
  //     try {
  //       await navigator.share({
  //         title: `Invoice #${invoice?.invoiceNumber}`,
  //         text: `Invoice for ${invoice?.customerName} - Amount: ₹${invoice?.invoiceAmount}`,
  //         url: window.location.href,
  //       })
  //     } catch (error) {
  //       console.log('Error sharing:', error)
  //     }
  //   } else {
  //     // Fallback: copy to clipboard
  //     navigator.clipboard.writeText(window.location.href)
  //     alert('Invoice link copied to clipboard!')
  //   }
  // }

  // const handleNewSale = () => {
  //   router.push('/dashboard/sale')
  // }

  // const handleBackToSales = () => {
  //   router.push('/dashboard/sales')
  // }

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
  //         <p className="text-gray-600">Loading invoice...</p>
  //       </div>
  //     </div>
  //   )
  // }

  // if (error) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center max-w-md">
  //         <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Connection Issue</h1>
  //         <p className="text-gray-600 mb-6">{error}</p>
          
  //         {error.includes('Backend server') && (
  //           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
  //             <h3 className="font-semibold text-yellow-800 mb-2">To start backend server:</h3>
  //             <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
  //               <li>Open terminal in: <code>c:\Users\hp\Desktop\backend</code></li>
  //               <li>Run: <code>npm install</code></li>
  //               <li>Run: <code>npm run dev</code></li>
  //               <li>Visit: <a href="http://localhost:3001/api/health" target="_blank" className="text-blue-600">http://localhost:3001/api/health</a></li>
  //             </ol>
  //           </div>
  //         )}
          
  //         <div className="space-x-4">
  //           <button 
  //             onClick={() => window.location.reload()}
  //             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
  //           >
  //             Retry
  //           </button>
  //           <button 
  //             onClick={handleBackToSales}
  //             className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
  //           >
  //             Back to Sales
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // if (!invoice) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
  //         <p className="text-gray-600 mb-6">The requested invoice could not be found.</p>
  //         <button 
  //           onClick={handleBackToSales}
  //           className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
  //         >
  //           Back to Sales
  //         </button>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Actions - Hidden during print */}
      <div className="print:hidden bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBackToSales}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                ← Back to Sales
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</h1>
                <p className="text-sm text-gray-500">Created on {invoice.invoiceDate}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleShare}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <span>📤</span>
                <span>Share</span>
              </button>
              <button 
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>
              <button 
                onClick={handleNewSale}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>New Sale</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none">
          {/* Invoice Header */}
          <div className="p-6 sm:p-8 border-b">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">TAX INVOICE</h1>
              <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✅ Invoice Created Successfully
              </div>
            </div>

            {/* Business and Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Bill From */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill From</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold text-blue-900">{invoice.businessId}</p>
                  <p className="text-blue-700 text-sm">Business Address</p>
                  <p className="text-blue-700 text-sm">City, State - 123456</p>
                  <p className="text-blue-700 text-sm">Phone: +91 XXXXX XXXXX</p>
                </div>
              </div>

              {/* Bill To */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">{invoice.customerName}</p>
                  <p className="text-gray-600 text-sm">Customer Address</p>
                  <p className="text-gray-600 text-sm">City, State</p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="font-semibold text-gray-900">#{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Invoice Date</p>
                <p className="font-semibold text-gray-900">{invoice.invoiceDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  parseFloat(invoice.balance) === 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {parseFloat(invoice.balance) === 0 ? 'Paid' : 'Partial'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Amount</p>
                <p className="font-semibold text-red-600">₹{invoice.balance}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">#</th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Item Name</th>
                    <th className="border-r border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-900">Qty</th>
                    <th className="border-r border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-900">Rate</th>
                    <th className="border-r border-gray-200 px-4 py-3 text-right text-sm font-semibold text-gray-900">Tax</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border-r border-gray-200 px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-center text-sm text-gray-900">{item.qty}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-right text-sm text-gray-900">₹{item.rate}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-right text-sm text-gray-900">-</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">₹{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="p-6 sm:p-8 border-t bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between">
              <div className="mb-6 sm:mb-0">
                <h4 className="font-semibold text-gray-900 mb-2">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Mode:</span>
                    <span className="font-medium">Cash</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Received Amount:</span>
                    <span className="font-medium text-green-600">₹{invoice.received}</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-80">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{invoice.invoiceAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SGST (9%):</span>
                    <span className="font-medium">₹0.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CGST (9%):</span>
                    <span className="font-medium">₹0.00</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">₹{invoice.invoiceAmount}</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between font-bold">
                      <span>Balance Due:</span>
                      <span className={parseFloat(invoice.balance) === 0 ? 'text-green-600' : 'text-red-600'}>
                        ₹{invoice.balance}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-8 border-t">
            <div className="text-center text-sm text-gray-500">
              <p>Thank you for your business!</p>
              <p className="mt-2">This invoice was generated on {new Date(invoice.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Print Hidden */}
        <div className="print:hidden mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleNewSale}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2"
          >
            <span>➕</span>
            <span>Create New Sale</span>
          </button>
          <button 
            onClick={handleBackToSales}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center space-x-2"
          >
            <span>📋</span>
            <span>View All Sales</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  )
}
