'use client'

import React, { useState } from 'react'

interface BankAccount {
  _id: string
  name: string
  openingBalance: number
  asOfDate: string
  accountNumber?: string
  bankName?: string
}

interface BankAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  editingIndex?: number
  initialData?: Partial<BankAccount>
  loading?: boolean
  error?: string
  useDivInsteadOfForm?: boolean
}

const BankAccountModal: React.FC<BankAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingIndex = -1,
  initialData = {},
  loading = false,
  error = '',
  useDivInsteadOfForm = false
}) => {
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [formData, setFormData] = useState({
    accountDisplayName: initialData.name || '',
    openingBalance: initialData.openingBalance?.toString() || '',
    asOfDate: initialData.asOfDate || new Date().toISOString().split('T')[0],
    accountNumber: initialData.accountNumber || '',
    ifscCode: '',
    upiId: '',
    bankName: initialData.bankName || '',
    accountHolderName: '',
    printBankDetails: false
  })

  // Update form data when initialData changes
  React.useEffect(() => {
    setFormData({
      accountDisplayName: initialData.name || '',
      openingBalance: initialData.openingBalance?.toString() || '',
      asOfDate: initialData.asOfDate || new Date().toISOString().split('T')[0],
      accountNumber: initialData.accountNumber || '',
      ifscCode: '',
      upiId: '',
      bankName: initialData.bankName || '',
      accountHolderName: '',
      printBankDetails: false
    })
  }, [initialData.name, initialData.openingBalance, initialData.asOfDate, initialData.accountNumber, initialData.bankName])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleDivSubmit = async (e: React.MouseEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleClose = () => {
    setShowMoreFields(false)
    onClose()
  }

  // Create the wrapper element based on useDivInsteadOfForm prop
  const WrapperElement = useDivInsteadOfForm ? 'div' : 'form'
  const wrapperProps = useDivInsteadOfForm 
    ? { className: "space-y-4" }
    : { onSubmit: handleSubmit, className: "space-y-4" }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingIndex >= 0 ? 'Edit Bank Account' : 'Add Bank Account'}
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <WrapperElement {...wrapperProps}>
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountDisplayName"
                  value={formData.accountDisplayName}
                  onChange={handleInputChange}
                  placeholder="Enter Account Display Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleInputChange}
                  placeholder="Enter Opening Balance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  As of Date
                </label>
                <input
                  type="date"
                  name="asOfDate"
                  value={formData.asOfDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Additional Fields - Row 2 */}
            {showMoreFields && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter Account Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="Enter IFSC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID for QR Code
                  </label>
                  <input
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="Enter UPI ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Additional Fields - Row 3 */}
            {showMoreFields && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Enter Bank Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    placeholder="Enter Account Holder Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button 
                type="button"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showMoreFields ? '- Hide fields' : '+ Add more fields'}
              </button>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="printBankDetails"
                  checked={formData.printBankDetails}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700 flex items-center">
                  Print Bank Details on Invoices
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type={useDivInsteadOfForm ? "button" : "submit"}
                onClick={useDivInsteadOfForm ? handleDivSubmit : undefined}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingIndex >= 0 ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingIndex >= 0 ? 'Update Account' : 'Add Account'
                )}
              </button>
            </div>
          </WrapperElement>
        </div>
      </div>
    </div>
  )
}

export default BankAccountModal
