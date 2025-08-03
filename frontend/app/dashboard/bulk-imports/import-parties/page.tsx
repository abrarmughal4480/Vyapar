'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, Eye, CheckCircle, AlertCircle, X, FileText, Users, ArrowLeft, BarChart3 } from 'lucide-react'
import Toast from '../../../components/Toast'
import { createParty } from '@/http/parties'
import * as XLSX from 'xlsx'

interface ImportParty {
  name: string
  contactNumber: string
  email: string
  address: string
  openingBalance: number
  openingDate?: string
  tin?: string
  receivableBalance?: number
  payableBalance?: number
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export default function BulkImportPartiesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parties, setParties] = useState<ImportParty[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pastedData, setPastedData] = useState('')

  const pakistaniProvinces = [
    'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan',
    'Azad Jammu and Kashmir', 'Islamabad Capital Territory'
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setToast({ message: 'Please upload a CSV or Excel file', type: 'error' })
      return
    }

    setUploadedFile(file)
    parseFile(file)
  }

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let workbook;
      if (file.name.endsWith('.csv')) {
        workbook = XLSX.read(e.target?.result, { type: 'string' });
      } else if (file.name.endsWith('.xlsx')) {
        workbook = XLSX.read(e.target?.result, { type: 'array' });
      }
      if (workbook) {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); // defval: '' for empty cells
        parseJSONParties(jsonData);
      }
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    }
  };

  const parseJSONParties = (jsonData: any[]) => {
    const phoneKeys = ['Contact Number', 'Phone No.', 'Phone', 'Mobile', 'Phone Number'];
    const parties: ImportParty[] = jsonData.map((row, i) => {
      let phone = '';
      for (const key of phoneKeys) {
        if (row[key] && String(row[key]).trim()) {
          phone = String(row[key]).trim();
          break;
        }
      }
      // Parse opening balance as number
      let openingBalance = 0;
      if (row['Opening Balance'] !== undefined && row['Opening Balance'] !== '') {
        const val = parseFloat(String(row['Opening Balance']).replace(/,/g, ''));
        openingBalance = isNaN(val) ? 0 : val;
      }
      return {
        name: row['Name'] || '',
        contactNumber: phone,
        email: row['Email ID'] || row['Email'] || '',
        address: row['Address'] || '',
        openingBalance,
        openingDate: row['Opening Date'] || '',
        tin: row['TIN'] || '',
        receivableBalance: row['Receivable Balance'] !== undefined && row['Receivable Balance'] !== '' ? Number(row['Receivable Balance']) : 0,
        payableBalance: row['Payable Balance'] !== undefined && row['Payable Balance'] !== '' ? Number(row['Payable Balance']) : 0,
      };
    });
    setParties(parties);

    // Validation (remove phone number digit validation)
    const errors: ValidationError[] = [];
    parties.forEach((party, idx) => {
      // Only email validation
      if (party.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email)) {
        errors.push({ row: idx + 1, field: 'email', message: 'Invalid email format' });
      }
    });
    setValidationErrors(errors);
    setShowPreview(true);
  };

  const validateParty = (party: ImportParty, row: number): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!party.name.trim()) {
      errors.push({ row, field: 'name', message: 'Name is required' })
    }

    if (party.contactNumber && !/^[0-9]{10}$/.test(party.contactNumber)) {
      errors.push({ row, field: 'contactNumber', message: 'Contact number must be 10 digits' })
    }

    if (party.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email)) {
      errors.push({ row, field: 'email', message: 'Invalid email format' })
    }

    return errors
  }

  const downloadTemplate = () => {
    const headers = [
      'Name', 'Contact Number', 'Email ID', 'Address', 'Opening Balance', 'Opening Date'
    ]
    
    const sampleData = [
      'John Doe', '9876543210', 'john@example.com', '123 Main St', '0', '2024-06-21'
    ]

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'parties_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      setToast({ message: 'Please fix validation errors before importing', type: 'error' })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || ''
      // Bulk import: send all parties in one request
      const response = await fetch(`${API_BASE_URL}/parties/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ parties })
      });
      const result = await response.json();
          if (result && result.success) {
        setToast({ message: result.message || 'Import completed!', type: 'success' })
        setImportProgress(100)
        setTimeout(() => {
          router.push('/dashboard/parties')
        }, 2000)
      } else {
        setToast({ message: result.message || 'Import failed. Please try again.', type: 'error' })
        setImportProgress(0)
      }
    } catch (error) {
      setToast({ message: 'Import failed. Please try again.', type: 'error' })
      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }
  };

  const resetImport = () => {
    setUploadedFile(null)
    setParties([])
    setValidationErrors([])
    setShowPreview(false)
    setImportProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getErrorCount = (row: number) => {
    return validationErrors.filter(error => error.row === row).length
  }

  const getFieldError = (row: number, field: string) => {
    return validationErrors.find(error => error.row === row && error.field === field)
  }

  const handlePasteData = () => {
    if (!pastedData.trim()) {
      setToast({ message: 'Please paste some data first', type: 'error' })
      return
    }
    // Handle Excel-like data (tab-separated)
    let processedData = pastedData
    if (pastedData.includes('\t')) {
      processedData = pastedData
        .split('\n')
        .map(line => line.replace(/\t/g, ','))
        .join('\n')
    }
    parseJSONParties(XLSX.utils.sheet_to_json(XLSX.read(processedData, { type: 'string' }).Sheets[XLSX.read(processedData, { type: 'string' }).SheetNames[0]], { defval: '' }));
    setShowPasteModal(false)
    setPastedData('')
  }

  // Add drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const file = files[0]
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setToast({ message: 'Please upload a CSV or Excel file', type: 'error' })
      return
    }
    setUploadedFile(file)
    parseFile(file)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="text-center md:text-left">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bulk Import Parties</h1>
                  <p className="text-sm text-gray-500 mt-1">Import multiple parties from Excel/CSV file</p>
                </div>
              </div>
            </div>
            {/* Action buttons will be added in the next step */}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {!showPreview && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Bulk Import Parties</h2>
              <p className="text-gray-600 mb-8 text-lg">Import multiple parties from Excel or CSV file with ease</p>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Template
                  </button>
                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Paste Data
                  </button>
                </div>
                <div className="relative">
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 bg-gradient-to-br ${
                      isDragOver 
                        ? 'border-blue-400 bg-blue-50 shadow-lg scale-105' 
                        : 'border-gray-300 hover:border-blue-400 from-gray-50 to-white'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-all duration-200 ${
                        isDragOver ? 'bg-blue-500 shadow-lg' : 'bg-gray-100'
                      }`}>
                        <Upload className={`h-8 w-8 transition-colors duration-200 ${
                          isDragOver ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer group">
                          <span className={`block text-lg font-semibold transition-colors duration-200 ${
                            isDragOver ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'
                          }`}>
                            {isDragOver ? 'Drop your file here' : 'Upload Excel/CSV file'}
                          </span>
                          <span className="block text-sm text-gray-500 mt-2">
                            {isDragOver ? 'Release to upload' : 'Drag and drop your file here, or click to browse'}
                          </span>
                          <span className="block text-xs text-gray-400 mt-1">
                            Supports .xlsx and .csv files
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv,.xlsx"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                        />
                      </div>
                    </div>
                  </div>
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-2xl pointer-events-none"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        {!showPreview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Easy Import</h3>
              <p className="text-sm text-gray-600">Upload your file and preview before importing</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Preview & Validate</h3>
              <p className="text-sm text-gray-600">Review data and fix errors before importing</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Bulk Import</h3>
              <p className="text-sm text-gray-600">Import hundreds of parties at once</p>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Import Preview</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {parties.length} parties • {validationErrors.length} errors
                  </span>
                  <button
                    onClick={resetImport}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-xl shadow-sm border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-blue-700">{parties.length}</div>
                      <div className="text-sm text-blue-600 font-medium">Total Parties</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-xl shadow-sm border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-700">{parties.length - validationErrors.length}</div>
                      <div className="text-sm text-green-600 font-medium">Valid</div>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-red-50 p-6 rounded-xl shadow-sm border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-red-700">{validationErrors.length}</div>
                      <div className="text-sm text-red-600 font-medium">Errors</div>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-700">{parties.length > 0 ? Math.round(((parties.length - validationErrors.length) / parties.length) * 100) : 0}%</div>
                      <div className="text-sm text-gray-600 font-medium">Success Rate</div>
                    </div>
                    <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              {validationErrors.length === 0 ? (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isImporting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span className="text-lg">Importing... {Math.round(importProgress)}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Users className="h-5 w-5 mr-2" />
                      <span className="text-lg">Import All Parties</span>
                    </div>
                  )}
                </button>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mr-4">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Validation Required</h4>
                      <p className="text-yellow-700">
                        Please fix validation errors before importing
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Progress Bar */}
            {isImporting && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Import Progress</h3>
                      <p className="text-sm text-gray-600">Processing your parties...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(importProgress)}%</div>
                    <div className="text-sm text-gray-500">Complete</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {Math.round(importProgress)} of {parties.length} parties processed
                </div>
              </div>
            )}
            {/* Parties Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Parties to Import</h3>
              </div>
              <div className="overflow-x-auto overflow-y-auto px-0">
                <table className="min-w-full w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TIN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receivable Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payable Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parties.map((party, index) => (
                      <tr key={index} className={getErrorCount(index + 1) > 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{party.name || ''}</div>
                          {getFieldError(index + 1, 'name') && (
                            <div className="text-xs text-red-600 mt-1">{getFieldError(index + 1, 'name')?.message}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.email || ''}</div>
                          {getFieldError(index + 1, 'email') && (
                            <div className="text-xs text-red-600 mt-1">{getFieldError(index + 1, 'email')?.message}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.contactNumber || ''}</div>
                          {getFieldError(index + 1, 'contactNumber') && (
                            <div className="text-xs text-red-600 mt-1">{getFieldError(index + 1, 'contactNumber')?.message}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.address || ''}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.tin || ''}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-700 font-semibold">{party.receivableBalance ?? 0}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-red-700 font-semibold">{party.payableBalance ?? 0}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-700 font-semibold">{(party.receivableBalance ?? 0) - (party.payableBalance ?? 0)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {showPasteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Paste Data</h3>
                <button
                  onClick={() => {
                    setShowPasteModal(false)
                    setPastedData('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your Excel/CSV data here (including headers):
                </label>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Name,Contact Number,Email ID,Address,Opening Balance,Opening Date\nJohn Doe,9876543210,john@example.com,123 Main St,0,2024-06-21"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasteModal(false)
                    setPastedData('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteData}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Process Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 