'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import JsBarcode from 'jsbarcode'

interface GeneratedCode {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

interface BarcodeResponse {
  success: boolean;
  message: string;
  data: any;
}

export default function BarcodeGeneratorPage() {
  const router = useRouter()
  const [productName, setProductName] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [downloadType, setDownloadType] = useState('')
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkCodes, setBulkCodes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const barcodeRef = useRef<SVGSVGElement>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (showPreview && skuCode.trim() && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, skuCode, {
          format: barcodeFormat,
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        })
      } catch (error) {
        console.error('Error generating barcode preview:', error)
        setError('Invalid SKU code for selected format')
      }
    }
  }, [showPreview, skuCode, barcodeFormat])

  const downloadBarcode = () => {
    if (!barcodeRef.current) return
    try {
      const svg = barcodeRef.current
      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const img = new Image()
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `barcode-${skuCode}.png`
            link.click()
          }
        })
        URL.revokeObjectURL(url)
      }
      img.src = url
      setDownloadType('Barcode')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error downloading barcode:', error)
    }
  }

  const generateRandomSKU = () => {
    const prefix = productName.replace(/\s+/g, '').toUpperCase().slice(0, 3) || 'PRD'
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    setSkuCode(`${prefix}-${random}`)
  }

  // Check backend status on mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          timeout: 5000,
        } as any);
        
        if (response.ok) {
          setBackendStatus('online');
          console.log('Backend is online');
        } else {
          setBackendStatus('offline');
          console.log('Backend is offline');
        }
      } catch (error) {
        setBackendStatus('offline');
        console.log('Backend is offline:', error);
      }
    };

    checkBackendStatus();
  }, [API_BASE_URL]);

  // Enhanced generate function with full backend integration
  const generateAndSaveBarcode = async () => {
    if (!skuCode.trim() || !productName.trim()) {
      setError('Product name and SKU code are required');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const payload = {
        productName: productName.trim(),
        skuCode: skuCode.trim(),
        barcodeFormat,
        price: price ? parseFloat(price) : undefined,
        category: category.trim() || undefined,
      };

      console.log('Sending barcode generation request:', payload);

      const response = await fetch(`${API_BASE_URL}/barcode/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server error' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result: BarcodeResponse = await response.json();
      console.log('Successful response:', result);

      if (result.success && result.data) {
        const newCode: GeneratedCode = {
          id: result.data.id || `gen-${Date.now()}`,
          code: result.data.code || skuCode,
          name: result.data.productName || productName,
          createdAt: result.data.createdAt || new Date().toISOString()
        };
        
        setGeneratedCodes(prev => [newCode, ...prev]);
        setShowPreview(true);
        setShowSuccessModal(true);
        setBackendStatus('online');
        
        // Clear form
        setProductName('');
        setSkuCode('');
        setPrice('');
        setCategory('');
      } else {
        throw new Error(result.message || 'Failed to generate barcode');
      }
    } catch (error: any) {
      console.error('Error generating barcode:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setBackendStatus('offline');
        setError('Backend server is not available. Please try again later.');
      } else {
        setError(error.message || 'Failed to generate barcode');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced bulk generation with backend
  const generateBulkCodesAPI = async () => {
    const codes = bulkCodes.split('\n').filter(code => code.trim());
    if (codes.length === 0) return;

    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/barcode/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codes })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newCodes = result.data.successful.map((item: any) => ({
            id: item.barcodeId,
            code: item.code,
            name: item.productName,
            createdAt: new Date().toISOString()
          }));
          setGeneratedCodes(prev => [...newCodes, ...prev]);
          setBackendStatus('online');
        }
      } else {
        throw new Error('Bulk generation failed');
      }
    } catch (error) {
      console.error('Backend error, falling back to client-side:', error);
      setBackendStatus('offline');
      
      // Fallback to client-side
      const newCodes = codes.map(code => ({
        id: `client-bulk-${Date.now()}-${Math.random()}`,
        code: code.trim(),
        name: `Product ${code.trim()}`,
        createdAt: new Date().toISOString()
      }));
      setGeneratedCodes(prev => [...newCodes, ...prev]);
    }

    setShowBulkModal(false);
    setBulkCodes('');
    setIsGenerating(false);
  };

  // Load barcode history from backend
  useEffect(() => {
    const loadBarcodeHistory = async () => {
      if (backendStatus !== 'online') return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/barcode/history`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const formattedCodes = result.data.map((item: any) => ({
              id: item.id,
              code: item.code,
              name: item.product?.name || 'Unknown Product',
              createdAt: item.createdAt
            }));
            setGeneratedCodes(formattedCodes);
          }
        }
      } catch (error) {
        console.error('Error loading barcode history:', error);
      }
    };

    if (backendStatus === 'online') {
      loadBarcodeHistory();
    } else if (backendStatus === 'offline') {
      // Load from localStorage
      const saved = localStorage.getItem('generatedCodes');
      if (saved) {
        try {
          const parsedCodes = JSON.parse(saved);
          if (Array.isArray(parsedCodes)) {
            setGeneratedCodes(parsedCodes);
          }
        } catch (error) {
          console.error('Error loading from localStorage:', error);
        }
      }
    }
  }, [backendStatus, API_BASE_URL]);

  // Save to localStorage when backend is offline
  useEffect(() => {
    if (backendStatus === 'offline' && generatedCodes.length > 0) {
      localStorage.setItem('generatedCodes', JSON.stringify(generatedCodes));
    }
  }, [generatedCodes, backendStatus]);

  const renderStatusIndicator = () => {
    if (backendStatus === 'checking') {
      return (
        <div className="flex items-center text-yellow-600">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-sm">Checking server...</span>
        </div>
      );
    } else if (backendStatus === 'online') {
      return (
        <div className="flex items-center text-green-600">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm">Server Online</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm">Server Offline</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      {/* Status Bar */}
      <div className="mb-4">
        {renderStatusIndicator()}
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Barcode Generator</h1>
        <p className="text-gray-600">Generate professional barcodes for your products</p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generation Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Generate Barcode</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code *</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter SKU code"
                />
                <button
                  onClick={generateRandomSKU}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="CODE39">CODE39</option>
                  <option value="EAN13">EAN13</option>
                  <option value="EAN8">EAN8</option>
                  <option value="UPC">UPC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Product category"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPreview(true)}
                disabled={!skuCode.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview
              </button>
              <button
                onClick={generateAndSaveBarcode}
                disabled={!skuCode.trim() || !productName.trim() || isGenerating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate & Save'}
              </button>
            </div>

            <button
              onClick={() => setShowBulkModal(true)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Bulk Generate
            </button>
          </div>
        </div>

        {/* Preview & History */}
        <div className="space-y-6">
          {/* Preview Section */}
          {showPreview && skuCode && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Barcode Preview</h3>
                <button
                  onClick={downloadBarcode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download
                </button>
              </div>
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                <svg ref={barcodeRef}></svg>
              </div>
              <div className="mt-4 text-center">
                <p className="font-medium">{productName}</p>
                <p className="text-sm text-gray-600">{skuCode}</p>
                {price && <p className="text-sm text-gray-600">₹{price}</p>}
              </div>
            </div>
          )}

          {/* Generated Codes History */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">
              Generated Codes ({generatedCodes.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {generatedCodes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No codes generated yet</p>
              ) : (
                generatedCodes.map((code) => (
                  <div key={code.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{code.name}</p>
                      <p className="text-sm text-gray-600">{code.code}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setProductName(code.name);
                        setSkuCode(code.code);
                        setShowPreview(true);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
                    >
                      Preview
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Success!</h3>
              <p className="text-gray-600 mb-4">
                {downloadType} has been {downloadType === 'Barcode' ? 'downloaded' : 'generated'} successfully!
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Bulk Generate Barcodes</h3>
            <textarea
              value={bulkCodes}
              onChange={(e) => setBulkCodes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
              placeholder="Enter SKU codes (one per line)"
            />
            <p className="text-sm text-gray-600 mt-2">
              Enter one SKU code per line. Products will be named automatically.
            </p>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={generateBulkCodesAPI}
                disabled={!bulkCodes.trim() || isGenerating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate All'}
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}