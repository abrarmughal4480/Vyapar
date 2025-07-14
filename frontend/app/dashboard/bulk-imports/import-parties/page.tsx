'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, Eye, CheckCircle, AlertCircle, X, FileText, Users, ArrowLeft } from 'lucide-react'
import Toast from '../../../components/Toast'
import { createParty } from '@/http/parties'

interface ImportParty {
  name: string
  type: 'Customer' | 'Supplier' | 'Both'
  phone: string
  email: string
  gstin: string
  pan: string
  address: string
  city: string
  state: string
  pincode: string
  openingBalance: number
  tags: string[]
  notes: string
  status: 'Active' | 'Inactive'
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
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (file.name.endsWith('.csv')) {
        parseCSV(text)
      } else {
        // For Excel files, you'd need a library like xlsx
        setToast({ message: 'Excel parsing not implemented yet. Please use CSV format.', type: 'error' })
      }
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    const headers = lines[0]?.split(',').map(h => h.trim()) || []
    
    const parsedParties: ImportParty[] = []
    const errors: ValidationError[] = []

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      const values = lines[i].split(',').map(v => v.trim())
      const party: ImportParty = {
        name: values[0] || '',
        type: (values[1] as 'Customer' | 'Supplier' | 'Both') || 'Customer',
        phone: values[2] || '',
        email: values[3] || '',
        gstin: values[4] || '',
        pan: values[5] || '',
        address: values[6] || '',
        city: values[7] || '',
        state: values[8] || '',
        pincode: values[9] || '',
        openingBalance: parseFloat(values[10]) || 0,
        tags: values[11] ? values[11].split('|').map(t => t.trim()) : [],
        notes: values[12] || '',
        status: (values[13] as 'Active' | 'Inactive') || 'Active'
      }

      // Validate party data
      const rowErrors = validateParty(party, i + 1)
      errors.push(...rowErrors)
      parsedParties.push(party)
    }

    setParties(parsedParties)
    setValidationErrors(errors)
    setShowPreview(true)
  }

  const validateParty = (party: ImportParty, row: number): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!party.name.trim()) {
      errors.push({ row, field: 'name', message: 'Name is required' })
    }

    if (party.phone && !/^\d{10}$/.test(party.phone)) {
      errors.push({ row, field: 'phone', message: 'Phone must be 10 digits' })
    }

    if (party.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email)) {
      errors.push({ row, field: 'email', message: 'Invalid email format' })
    }

    if (party.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(party.gstin)) {
      errors.push({ row, field: 'gstin', message: 'Invalid GSTIN format' })
    }

    if (party.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(party.pan)) {
      errors.push({ row, field: 'pan', message: 'Invalid PAN format' })
    }

    if (party.pincode && !/^\d{6}$/.test(party.pincode)) {
      errors.push({ row, field: 'pincode', message: 'Pincode must be 6 digits' })
    }

    return errors
  }

  const downloadTemplate = () => {
    const headers = [
      'Name', 'Type', 'Phone', 'Email', 'GSTIN', 'PAN', 'Address', 
      'City', 'State', 'Pincode', 'Opening Balance', 'Tags', 'Notes', 'Status'
    ]
    
    const sampleData = [
      'John Doe', 'Customer', '9876543210', 'john@example.com', '22AAAAA0000A1Z5', 
      'ABCDE1234F', '123 Main St', 'Mumbai', 'Maharashtra', '400001', '0', 
      'VIP|Regular', 'Important customer', 'Active'
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

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      setToast({ message: 'Please fix validation errors before importing', type: 'error' })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || ''
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < parties.length; i++) {
        try {
          const party = parties[i]
          const result = await createParty({
            name: party.name,
            partyType: party.type,
            phone: party.phone,
            email: party.email,
            gstNumber: party.gstin,
            pan: party.pan,
            address: party.address,
            city: party.city,
            state: party.state,
            pincode: party.pincode,
            openingBalance: party.openingBalance,
            tags: party.tags,
            note: party.notes,
            status: party.status.toLowerCase()
          }, token)

          if (result && result.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }

        setImportProgress(((i + 1) / parties.length) * 100)
      }

      setToast({ 
        message: `Import completed! ${successCount} parties imported successfully, ${errorCount} failed.`, 
        type: successCount > 0 ? 'success' : 'error' 
      })

      if (successCount > 0) {
        setTimeout(() => {
          router.push('/dashboard/parties')
        }, 2000)
      }
    } catch (error) {
      setToast({ message: 'Import failed. Please try again.', type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk Import Parties</h1>
                <p className="text-sm text-gray-600">Import multiple parties from CSV file</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {!showPreview && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Parties</h2>
              <p className="text-gray-600 mb-6">Upload a CSV file to import multiple parties at once</p>

              <div className="space-y-4">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload CSV file
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          CSV, XLSX up to 10MB
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
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {showPreview && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{parties.length}</div>
                  <div className="text-sm text-blue-600">Total Parties</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {parties.length - validationErrors.length}
                  </div>
                  <div className="text-sm text-green-600">Valid</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{validationErrors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {Math.round(((parties.length - validationErrors.length) / parties.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>

              {validationErrors.length === 0 ? (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing... {Math.round(importProgress)}%
                    </div>
                  ) : (
                    'Import All Parties'
                  )}
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800">
                      Please fix validation errors before importing
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isImporting && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{Math.round(importProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Parties Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Parties to Import</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parties.map((party, index) => (
                      <tr key={index} className={getErrorCount(index + 1) > 0 ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{party.name}</div>
                          {getFieldError(index + 1, 'name') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'name')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            party.type === 'Customer' ? 'bg-blue-100 text-blue-800' :
                            party.type === 'Supplier' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {party.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.phone}</div>
                          {getFieldError(index + 1, 'phone') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'phone')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{party.email}</div>
                          {getFieldError(index + 1, 'email') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'email')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getErrorCount(index + 1) === 0 ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="ml-2 text-sm text-gray-900">
                              {getErrorCount(index + 1) === 0 ? 'Valid' : `${getErrorCount(index + 1)} errors`}
                            </span>
                          </div>
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
    </div>
  )
} 