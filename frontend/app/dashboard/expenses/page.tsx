"use client";
import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getExpenses, getExpenseStats } from '../../../http/expenses';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('Categories');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseStats, setExpenseStats] = useState<any>({ byCategory: [], byItem: [] });
  const [loading, setLoading] = useState(true);
  const [expenseItems, setExpenseItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const router = useRouter();

  // Fetch expenses and stats when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [expensesResponse, statsResponse] = await Promise.all([
          getExpenses(),
          getExpenseStats()
        ]);
        
        setExpenses(expensesResponse.data || []);
        setExpenseStats(statsResponse.data || { byCategory: [], byItem: [] });
        setFilteredExpenses(expensesResponse.data || []);
        
        // Set default selection - first category by default (using merged data)
        if (statsResponse.data?.byCategory && statsResponse.data.byCategory.length > 0) {
          // Merge categories to avoid duplicates
          const mergedCategories = statsResponse.data.byCategory.reduce((acc: any[], category: any) => {
            const existingCategory = acc.find(cat => cat._id === category._id);
            if (existingCategory) {
              existingCategory.total += category.total;
            } else {
              acc.push({ ...category });
            }
            return acc;
          }, []);
          
          if (mergedCategories.length > 0) {
            const firstCategory = mergedCategories[0]._id;
            setSelectedCategory(firstCategory);
            // Filter expenses after setting the expenses state
            const filtered = expensesResponse.data.filter((expense: any) => 
              expense.expenseCategory && expense.expenseCategory.toLowerCase() === firstCategory.toLowerCase()
            );
            setFilteredExpenses(filtered);
          }
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Effect to apply default filtering when expenses data is available
  useEffect(() => {
    if (expenses.length > 0 && selectedCategory && !filteredExpenses.length) {
      // Apply default category filter when expenses data is loaded
      const filtered = expenses.filter((expense: any) => 
        expense.expenseCategory && expense.expenseCategory.toLowerCase() === selectedCategory.toLowerCase()
      );
      setFilteredExpenses(filtered);
    }
  }, [expenses, selectedCategory, filteredExpenses.length]);

  // Function to filter expenses based on selection
  const filterExpenses = (type: 'category' | 'item', value: string) => {
    if (!value.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    let filtered: any[] = [];
    
    if (type === 'category') {
      filtered = expenses.filter(expense => 
        expense.expenseCategory && expense.expenseCategory.toLowerCase() === value.toLowerCase()
      );
    } else if (type === 'item') {
      filtered = expenses.filter(expense => 
        expense.items && expense.items.some((item: any) => 
          item.item && item.item.toLowerCase() === value.toLowerCase()
        )
      );
    }
    
    setFilteredExpenses(filtered);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header - sticky, card-like, shadow, rounded (similar to sale page) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your business expenses and costs</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <button 
              onClick={() => router.push('/dashboard/purchaseAdd?from=expenses')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
            >
              + Add Expense
            </button>
            <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Toggle Buttons - Categories and Items */}
        <div className="mt-6 flex w-full">
          <button
            onClick={() => {
              setActiveTab('Categories');
              // Set default selection for Categories tab (using merged data)
              if (expenseStats.byCategory && expenseStats.byCategory.length > 0) {
                // Merge categories to avoid duplicates
                const mergedCategories = expenseStats.byCategory.reduce((acc: any[], category: any) => {
                  const existingCategory = acc.find(cat => cat._id === category._id);
                  if (existingCategory) {
                    existingCategory.total += category.total;
                  } else {
                    acc.push({ ...category });
                  }
                  return acc;
                }, []);
                
                if (mergedCategories.length > 0) {
                  const firstCategory = mergedCategories[0]._id;
                  setSelectedCategory(firstCategory);
                  setSelectedItem('');
                  // Filter expenses directly
                  const filtered = expenses.filter((expense: any) => 
                    expense.expenseCategory && expense.expenseCategory.toLowerCase() === firstCategory.toLowerCase()
                  );
                  setFilteredExpenses(filtered);
                } else {
                  setSelectedCategory('');
                  setSelectedItem('');
                  setFilteredExpenses(expenses);
                }
              } else {
                setSelectedCategory('');
                setSelectedItem('');
                setFilteredExpenses(expenses);
              }
            }}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors relative ${
              activeTab === 'Categories' 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Categories
            {activeTab === 'Categories' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('Items');
              // Set default selection for Items tab
              const uniqueItems = [...new Set(expenses.flatMap((expense: any) => 
                expense.items.map((item: any) => item.item)
              ))].filter((item: string) => item && item.trim() !== '');
              
              setExpenseItems(uniqueItems);
              
              if (uniqueItems.length > 0) {
                const firstItem = uniqueItems[0];
                setSelectedItem(firstItem);
                setSelectedCategory('');
                // Filter expenses directly
                const filtered = expenses.filter((expense: any) => 
                  expense.items && expense.items.some((item: any) => 
                    item.item && item.item.toLowerCase() === firstItem.toLowerCase()
                  )
                );
                setFilteredExpenses(filtered);
              } else {
                setSelectedItem('');
                setSelectedCategory('');
                setFilteredExpenses(expenses);
              }
            }}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors relative ${
              activeTab === 'Items' 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Items
            {activeTab === 'Items' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Two Div Blocks - 30% Left and 70% Right */}
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Block - 30% Width */}
        <div className="w-[30%] bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {activeTab === 'Categories' ? 'Category' : 'Item'}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : activeTab === 'Categories' ? (
                  // Categories data from API - merged to avoid duplicates
                  expenseStats.byCategory && expenseStats.byCategory.length > 0 ? (
                    (() => {
                      // Merge categories with same names and sum their totals
                      const mergedCategories = expenseStats.byCategory.reduce((acc: any[], category: any) => {
                        const existingCategory = acc.find(cat => cat._id === category._id);
                        if (existingCategory) {
                          existingCategory.total += category.total;
                        } else {
                          acc.push({ ...category });
                        }
                        return acc;
                      }, []);
                      
                      return mergedCategories.map((category: any, index: number) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedCategory === category._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => {
                            if (selectedCategory === category._id) {
                              // Deselect if already selected
                              setSelectedCategory('');
                              setSelectedItem('');
                              setFilteredExpenses(expenses);
                            } else {
                              setSelectedCategory(category._id);
                              setSelectedItem('');
                              filterExpenses('category', category._id);
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">{category._id}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                            PKR {category.total.toLocaleString()}
                          </td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm text-center text-gray-500">
                        No categories found
                      </td>
                    </tr>
                  )
                ) : (
                  // Items data from API - merged to avoid duplicates
                  expenses && expenses.length > 0 ? (
                    (() => {
                      // Merge items with same names and sum their amounts
                      const itemMap = new Map();
                      
                      expenses.forEach((expense: any) => {
                        expense.items.forEach((item: any) => {
                          if (item.item && item.item.trim()) {
                            const existingAmount = itemMap.get(item.item) || 0;
                            itemMap.set(item.item, existingAmount + (item.amount || 0));
                          }
                        });
                      });
                      
                      const mergedItems = Array.from(itemMap.entries()).map(([itemName, totalAmount]) => ({
                        item: itemName,
                        amount: totalAmount
                      }));
                      
                      return mergedItems.map((item: any, index: number) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedItem === item.item ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => {
                            if (selectedItem === item.item) {
                              // Deselect if already selected
                              setSelectedItem('');
                              setSelectedCategory('');
                              setFilteredExpenses(expenses);
                            } else {
                              setSelectedItem(item.item);
                              setSelectedCategory('');
                              filterExpenses('item', item.item);
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                            PKR {item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm text-center text-gray-500">
                        No items found
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Block - 70% Width */}
        <div className="w-[70%] bg-white rounded-2xl shadow-lg p-6 border border-gray-100">        
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expense Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Party</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Type</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredExpenses && filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense: any) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(expense.expenseDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                        {expense.expenseNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {expense.party}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {expense.paymentType}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        PKR {expense.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                        PKR 0
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-center text-gray-500">
                      {selectedCategory || selectedItem ? 'No expenses found for selected filter' : 'No expenses found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}