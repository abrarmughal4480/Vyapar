'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, Eye, CheckCircle, AlertCircle, X, FileText, Package, ArrowLeft, BarChart3 } from 'lucide-react'
import Toast from '../../../components/Toast'
import { addItem, bulkImportItems } from '@/http/items'
import * as XLSX from 'xlsx'
import { getToken, getUserIdFromToken } from '../../../lib/auth'

interface ImportItem {
  name: string
  itemCode: string
  category: string
  hsn: string
  salePrice: number
  purchasePrice: number
  wholesalePrice: number
  minimumWholesaleQuantity: number
  discountType: string
  saleDiscount: number
  openingStockQuantity: number
  minimumStockQuantity: number
  itemLocation: string
  taxRate: number // parsed numeric value
  taxRateRaw: string // original string from Excel/CSV
  inclusiveOfTax: boolean // parsed boolean
  inclusiveOfTaxRaw: string // original string from Excel/CSV
  baseUnit: string
  secondaryUnit: string
  conversionRate: number | ''
  conversionRateRaw: string // original string from Excel/CSV
  status: 'Active' | 'Inactive'
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export default function BulkImportItemsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string>('')
  const [processedItems, setProcessedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pastedData, setPastedData] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [rawDataPreview, setRawDataPreview] = useState<string>('')

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setToast({ message: 'Please upload a CSV or Excel file', type: 'error' })
      return
    }

    setUploadedFile(file)
    parseFile(file)
  }

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
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setToast({ message: 'Please upload a CSV or Excel file', type: 'error' })
      return
    }

    setUploadedFile(file)
    parseFile(file)
  }

  const parseFile = (file: File) => {
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        parseCSV(text)
      }
      reader.onerror = () => {
        console.error('Error reading CSV file')
        setToast({ message: 'Error reading CSV file. Please try again.', type: 'error' })
      }
      reader.readAsText(file)
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer
        parseExcel(arrayBuffer)
      }
      reader.onerror = () => {
        console.error('Error reading Excel file')
        setToast({ message: 'Error reading Excel file. Please try again.', type: 'error' })
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const parseExcel = (arrayBuffer: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to CSV format with better options
      const csvData = XLSX.utils.sheet_to_csv(worksheet, {
        FS: ',',
        RS: '\n',
        forceQuotes: false,
        blankrows: false
      })
      
      parseCSV(csvData)
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      setToast({ message: 'Error parsing Excel file. Please check the file format.', type: 'error' })
    }
  }



  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    
    // Try to detect delimiter by checking first few lines
    let delimiter = ','
    const firstLine = lines[0] || ''
    const secondLine = lines[1] || ''
    
    // Check if it's tab-separated
    if (firstLine.includes('\t') && secondLine.includes('\t')) {
      delimiter = '\t'
    } else if (firstLine.includes(';') && secondLine.includes(';')) {
      delimiter = ';'
    }
    
    const headers = lines[0]?.split(delimiter).map(h => h.trim().replace(/"/g, '')) || []
    
    const parsedItems: ImportItem[] = []
    const errors: ValidationError[] = []
    let skipNextLine = false
    let processedCount = 0
    let skippedCount = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        skippedCount++
        continue
      }
      
      if (skipNextLine) {
        skipNextLine = false
        skippedCount++
        continue
      }
      
      // Parse CSV line properly handling quoted fields
      const values = parseCSVLine(line, delimiter)
      
      // Skip comment/instruction rows (any cell starts with '**' or line starts with '**')
      if (line.startsWith('**') || values.some(v => v.startsWith('**'))) {
        skipNextLine = true
        skippedCount++
        continue
      }
      
      // Skip rows where all cells are empty
      if (values.every(v => v === '')) {
        skippedCount++
        continue
      }
      
      // Skip rows with no item name (column 0)
      if (!values[0] || values[0].startsWith('**')) {
        skippedCount++
        continue
      }

      // Map columns based on actual Excel structure:
      // 0: Item name*, 1: Item code, 2: Category, 3: HSN, 4: Sale price, 5: Purchase price, 
      // 6: Online Store Price, 7: Discount Type, 8: Sale Discount, 9: Current stock quantity, 
      // 10: Minimum stock quantity, 11: Item Location, 12: Tax Rate, 13: Inclusive Of Tax, 
      // 14: Base Unit (x), 15: Secondary Unit (y), 16: Conversion Rate (n) (x = ny)
      
      // Tax Rate: extract number, but keep original
      const taxRateRaw = values[12] || ''
      const taxRateMatch = taxRateRaw.match(/([\d.]+)/)
      const taxRate = taxRateMatch ? parseFloat(taxRateMatch[1]) : 0
      
      // Inclusive/Exclusive: keep original, parse boolean
      const inclusiveOfTaxRaw = values[13] || ''
      const inclusiveOfTax = inclusiveOfTaxRaw.toLowerCase() === 'inclusive' || 
                            inclusiveOfTaxRaw.toLowerCase() === 'yes' ||
                            inclusiveOfTaxRaw.toLowerCase() === 'true'
      
      // Conversion Rate: keep original, parse number or empty
      const conversionRateRaw = values[16] || ''
      const conversionRate = conversionRateRaw ? parseFloat(conversionRateRaw) : ''

      const item: ImportItem = {
        name: values[0] || '',
        itemCode: values[1] || '',
        category: values[2] || '',
        hsn: values[3] || '',
        salePrice: parseFloat(values[4]) || 0,
        purchasePrice: parseFloat(values[5]) || 0,
        wholesalePrice: parseFloat(values[6]) || 0, // Online Store Price maps to wholesale
        minimumWholesaleQuantity: 0, // Not in your data
        discountType: values[7] || '',
        saleDiscount: parseFloat(values[8]) || 0,
        openingStockQuantity: parseFloat(values[9]) || 0, // Current stock quantity
        minimumStockQuantity: parseFloat(values[10]) || 0,
        itemLocation: values[11] || '',
        taxRate, // parsed
        taxRateRaw, // original
        inclusiveOfTax, // parsed
        inclusiveOfTaxRaw, // original
        baseUnit: values[14] || '',
        secondaryUnit: values[15] || '',
        conversionRate, // parsed or ''
        conversionRateRaw, // original
        status: 'Active'
      }

      // Validate item data (use parsed values)
      const rowErrors = validateItem(item, i + 1)
      errors.push(...rowErrors)
      parsedItems.push(item)
      processedCount++
    }



    setItems(parsedItems)
    setValidationErrors(errors)
    setShowPreview(true)
  }

  // Helper function to properly parse CSV lines with quoted fields
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0
    
    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === delimiter && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
        i++
      } else {
        // Regular character
        current += char
        i++
      }
    }
    
    // Add the last field
    result.push(current.trim())
    
    return result
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
    
    parseCSV(processedData)
    setShowPasteModal(false)
    setPastedData('')
  }

  const validateItem = (item: ImportItem, row: number): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!item.name.trim()) {
      errors.push({ row, field: 'name', message: 'Item name is required' })
    }



    if (item.salePrice < 0) {
      errors.push({ row, field: 'salePrice', message: 'Sale price cannot be negative' })
    }

    if (item.purchasePrice < 0) {
      errors.push({ row, field: 'purchasePrice', message: 'Purchase price cannot be negative' })
    }

    if (item.wholesalePrice < 0) {
      errors.push({ row, field: 'wholesalePrice', message: 'Wholesale price cannot be negative' })
    }



    if (item.minimumStockQuantity < 0) {
      errors.push({ row, field: 'minimumStockQuantity', message: 'Minimum stock cannot be negative' })
    }

    if (item.taxRate < 0 || item.taxRate > 100) {
      errors.push({ row, field: 'taxRate', message: 'Tax rate must be between 0 and 100' })
    }

    // Only require conversionRate if both baseUnit and secondaryUnit are provided
    if (item.baseUnit && item.secondaryUnit) {
      if (
        item.conversionRate === '' ||
        (typeof item.conversionRate === 'number' && item.conversionRate <= 0)
      ) {
        errors.push({ row, field: 'conversionRate', message: 'Conversion rate must be greater than 0' })
      }
    }
    // If either baseUnit or secondaryUnit is empty, allow conversionRate to be empty

    return errors
  }

  const downloadTemplate = () => {
    const headers = [
      'Item name*',
      'Item code',
      'Category',
      'HSN',
      'Sale price',
      'Purchase price',

      'Discount Type',
      'Sale Discount',
      'Current stock quantity',
      'Minimum stock quantity',
      'Item Location',
      'Tax Rate',
      'Inclusive Of Tax',
      'Base Unit (x)',
      'Secondary Unit (y)',
      'Conversion Rate (n) (x = ny)'
    ]
    
    const sampleData = [
      'Sample Item',
      'ITM001',
      'Electronics',
      '85171200',
      '1000.00',
      '800.00',

      'Discount %',
      '5.00',
      '50',
      '5',
      'Warehouse A',
      '18.00',
      'Yes',
      'Pieces',
      'Boxes',
      '10'
    ]

    // Create CSV template
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const csvBlob = new Blob([csvContent], { type: 'text/csv' })
    const csvUrl = window.URL.createObjectURL(csvBlob)
    const csvLink = document.createElement('a')
    csvLink.href = csvUrl
    csvLink.download = 'items_import_template.csv'
    csvLink.click()
    window.URL.revokeObjectURL(csvUrl)

    // Create Excel template
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleData])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Template')
    XLSX.writeFile(workbook, 'items_import_template.xlsx')
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      setToast({ message: 'Please fix validation errors before importing', type: 'error' })
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportStatus('Initializing import...')
    setProcessedItems(0)
    setTotalItems(items.length)
    setCurrentChunk(0)
    setSuccessCount(0)
    setErrorCount(0)

    try {
      const token = getToken()
      
      // Check if token is available
      if (!token) {
        setToast({ message: 'Authentication token not found. Please login again.', type: 'error' })
        setIsImporting(false)
        return
      }

      // Extract userId from JWT token using utility function
      const userId = getUserIdFromToken()
      
      // Check if userId is available
      if (!userId) {
        setToast({ message: 'User not found. Please login again.', type: 'error' })
        setIsImporting(false)
        return
      }
      
      // Prepare items for bulk import with all the new fields
      const itemsToImport = items.map(item => ({
        name: item.name,
        itemCode: item.itemCode,
        category: item.category,
        hsn: item.hsn,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        wholesalePrice: item.wholesalePrice,
        minimumWholesaleQuantity: item.minimumWholesaleQuantity,
        discountType: item.discountType,
        saleDiscount: item.saleDiscount,
        openingStockQuantity: item.openingStockQuantity,
        minimumStockQuantity: item.minimumStockQuantity,
        itemLocation: item.itemLocation,
        taxRate: item.taxRate,
        taxRateRaw: item.taxRateRaw,
        inclusiveOfTax: item.inclusiveOfTax,
        inclusiveOfTaxRaw: item.inclusiveOfTaxRaw,
        baseUnit: item.baseUnit,
        secondaryUnit: item.secondaryUnit,
        conversionRate: item.conversionRate,
        conversionRateRaw: item.conversionRateRaw,
        status: item.status
      }))

      console.log('Calling bulk import with userId:', userId, 'and items count:', itemsToImport.length)

      // Optimized import with chunking for large datasets
      const CHUNK_SIZE = 100; // Reduced chunk size for better reliability
      const chunks = [];
      
      for (let i = 0; i < itemsToImport.length; i += CHUNK_SIZE) {
        chunks.push(itemsToImport.slice(i, i + CHUNK_SIZE));
      }

      setTotalChunks(chunks.length)
      setImportStatus(`Preparing to import ${itemsToImport.length} items in ${chunks.length} chunks...`)
      setImportProgress(2) // Start at 2% instead of 5%

      let totalSuccessCount = 0;
      let totalErrorCount = 0;
      let totalProcessingTime = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setCurrentChunk(i + 1)
        setImportStatus(`Processing chunk ${i + 1} of ${chunks.length} (${chunk.length} items)...`)
        
        // Improved progress calculation: 2% to 95%
        const chunkProgress = 2 + ((i / chunks.length) * 93);
        setImportProgress(Math.round(chunkProgress));

        try {
          console.log(`Starting chunk ${i + 1} with ${chunk.length} items...`);
          const result = await bulkImportItems(userId, chunk, token);
          console.log(`Chunk ${i + 1} result:`, result);
          
          if (result && result.success) {
            const chunkSuccess = result.data?.successCount || 0;
            const chunkErrors = result.data?.errorCount || 0;
            const chunkTime = result.data?.processingTime || 0;
            
            totalSuccessCount += chunkSuccess;
            totalErrorCount += chunkErrors;
            totalProcessingTime += chunkTime;
            
            setSuccessCount(totalSuccessCount)
            setErrorCount(totalErrorCount)
            setProcessedItems((i + 1) * CHUNK_SIZE)
            
            setImportStatus(`Chunk ${i + 1} completed: ${chunkSuccess} success, ${chunkErrors} errors (${chunkTime}ms)`)
            console.log(`Chunk ${i + 1} completed successfully`);
          } else {
            totalErrorCount += chunk.length;
            setErrorCount(totalErrorCount)
            setProcessedItems((i + 1) * CHUNK_SIZE)
            setImportStatus(`Chunk ${i + 1} failed: ${result?.message || 'Unknown error'}`)
            console.error(`Chunk ${i + 1} failed:`, result);
          }
        } catch (error) {
          console.error(`Error importing chunk ${i + 1}:`, error);
          totalErrorCount += chunk.length;
          setErrorCount(totalErrorCount)
          setProcessedItems((i + 1) * CHUNK_SIZE)
          setImportStatus(`Chunk ${i + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      setImportProgress(98);
      setImportStatus('Finalizing import...')

      // Final success message
      const avgProcessingTime = chunks.length > 0 ? Math.round(totalProcessingTime / chunks.length) : 0;
      const successMessage = `Import completed! ${totalSuccessCount} items imported successfully, ${totalErrorCount} failed. Average processing time: ${avgProcessingTime}ms per chunk.`;
      
      setToast({ 
        message: successMessage, 
        type: 'success' 
      })

      setImportProgress(100)
      setImportStatus(`Import completed successfully! ${totalSuccessCount} items imported.`)
      
      setTimeout(() => {
        router.push('/dashboard/items')
      }, 3000)
      
    } catch (error: any) {
      console.error('Import error:', error)
      let errorMessage = 'Import failed. Please try again.'
      
      if (error.message?.includes('Payload too large')) {
        errorMessage = 'File too large. Please try importing fewer items at once or split your file into smaller chunks.'
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Import timed out. Please try again with fewer items.'
      } else if (error.message?.includes('413')) {
        errorMessage = 'Server rejected the request due to size. Please try importing fewer items.'
      }
      
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  const resetImport = () => {
    setUploadedFile(null)
    setItems([])
    setValidationErrors([])
    setShowPreview(false)
    setImportProgress(0)
    setImportStatus('')
    setProcessedItems(0)
    setTotalItems(0)
    setCurrentChunk(0)
    setTotalChunks(0)
    setSuccessCount(0)
    setErrorCount(0)
    setPastedData('')
    setRawDataPreview('')
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
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bulk Import Items</h1>
                  <p className="text-sm text-gray-500 mt-1">Import multiple items from Excel/CSV file</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              <button
                onClick={downloadTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
              <button
                onClick={() => setShowPasteModal(true)}
                className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Upload Section */}
        {!showPreview && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Bulk Import Items</h2>
              <p className="text-gray-600 mb-8 text-lg">Import multiple items from Excel or CSV file with ease</p>

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
                            Supports .xlsx, .xls, and .csv files
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv,.xlsx,.xls"
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

                {/* Features Section */}
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
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Bulk Import</h3>
                    <p className="text-sm text-gray-600">Import hundreds of items at once</p>
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
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Import Preview</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {items.length} items • {validationErrors.length} errors
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
                      <div className="text-3xl font-bold text-blue-700">{items.length}</div>
                      <div className="text-sm text-blue-600 font-medium">Total Items</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-xl shadow-sm border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-700">
                        {items.length - validationErrors.length}
                      </div>
                      <div className="text-sm text-green-600 font-medium">Valid Items</div>
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
                      <div className="text-3xl font-bold text-gray-700">
                        {items.length > 0 ? Math.round(((items.length - validationErrors.length) / items.length) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Success Rate</div>
                    </div>
                    <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {validationErrors.length === 0 ? (
                <div className="space-y-3">
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isImporting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        <div className="text-center">
                          <div className="text-lg">Importing... {Math.round(importProgress)}%</div>
                          <div className="text-sm opacity-90">{successCount} success, {errorCount} errors</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Package className="h-5 w-5 mr-2" />
                        <span className="text-lg">Import {items.length} Items</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Import Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900">Import Summary</h4>
                      <div className="text-sm text-blue-600 font-medium">{items.length} items ready</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Total Items:</span>
                        <span className="ml-2 font-medium">{items.length}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Chunks:</span>
                        <span className="ml-2 font-medium">{Math.ceil(items.length / 500)}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Estimated Time:</span>
                        <span className="ml-2 font-medium">~{Math.ceil(items.length / 500) * 2}s</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Status:</span>
                        <span className="ml-2 font-medium text-green-600">Ready to Import</span>
                      </div>
                    </div>
                  </div>
                </div>
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

            {/* Enhanced Progress Bar */}
            {isImporting && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Import Progress</h3>
                      <p className="text-sm text-gray-600">{importStatus}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(importProgress)}%</div>
                    <div className="text-sm text-gray-500">Complete</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                
                {/* Detailed Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{processedItems}</div>
                    <div className="text-xs text-gray-500">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{successCount}</div>
                    <div className="text-xs text-gray-500">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{errorCount}</div>
                    <div className="text-xs text-gray-500">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{currentChunk}/{totalChunks}</div>
                    <div className="text-xs text-gray-500">Chunks</div>
                  </div>
                </div>
                
                {/* Progress Details */}
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Total Items: {totalItems}</div>
                  <div>Progress: {processedItems} of {totalItems} items processed</div>
                  {totalChunks > 1 && (
                    <div>Chunk Progress: {currentChunk} of {totalChunks} chunks completed</div>
                  )}
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Items to Import</h3>
              </div>
              <div className="overflow-x-auto overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        HSN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Price
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discount Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale Discount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inclusive
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Base Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Secondary Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conv Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index} className={getErrorCount(index + 1) > 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          {getFieldError(index + 1, 'name') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'name')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.itemCode}</div>
                          {getFieldError(index + 1, 'itemCode') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'itemCode')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.category}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.hsn}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">PKR {item.salePrice}</div>
                          {getFieldError(index + 1, 'salePrice') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'salePrice')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">PKR {item.purchasePrice}</div>
                          {getFieldError(index + 1, 'purchasePrice') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'purchasePrice')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.discountType}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.saleDiscount}%</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.openingStockQuantity}</div>
                          {getFieldError(index + 1, 'openingStockQuantity') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'openingStockQuantity')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.minimumStockQuantity}</div>
                          {getFieldError(index + 1, 'minimumStockQuantity') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'minimumStockQuantity')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.itemLocation}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.taxRateRaw}</div>
                          {getFieldError(index + 1, 'taxRate') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'taxRate')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.inclusiveOfTaxRaw}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.baseUnit}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.secondaryUnit}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.conversionRateRaw}</div>
                          {getFieldError(index + 1, 'conversionRate') && (
                            <div className="text-xs text-red-600 mt-1">
                              {getFieldError(index + 1, 'conversionRate')?.message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
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

      {/* Paste Modal */}
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
                  placeholder="Item Name	Item Code	Category	HSN	Sale Price	Purchase Price	Wholesale Price	Minimum Wholesale Quantity	Discount Type	Sale Discount	Opening Stock Quantity	Minimum Stock Quantity	Item Location	Tax Rate	Inclusive of Tax	Base Unit (x)	Secondary Unit (y)	Conversion Rate n (x=ny)&#10;Sample Item	ITM001	Electronics	85171200	1000.00	800.00	900.00	10	Percentage	5.00	50	5	Warehouse A	18.00	Yes	Pieces	Boxes	10"
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
