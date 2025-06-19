const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Dashboard stats
app.get('/dashboard/stats/:businessId', (req, res) => {
  res.json({
    totalSales: 150000,
    totalPurchases: 120000,
    totalProfit: 30000,
    totalParties: 25,
    totalItems: 150
  });
});

// Parties
app.get('/parties/:businessId', (req, res) => {
  res.json([
    { id: '1', name: 'ABC Electronics', type: 'Customer', balance: 5000 },
    { id: '2', name: 'XYZ Suppliers', type: 'Supplier', balance: -3000 }
  ]);
});

// Items
app.get('/items/:businessId', (req, res) => {
  res.json([
    { id: '1', name: 'Samsung Galaxy S23', stock: 15, price: 50000 },
    { id: '2', name: 'iPhone 14', stock: 8, price: 70000 }
  ]);
});

// Sales
app.get('/sale/:businessId', (req, res) => {
  res.json([
    { id: '1', invoiceNumber: 'INV-001', amount: 50000, status: 'Paid' },
    { id: '2', invoiceNumber: 'INV-002', amount: 25000, status: 'Pending' }
  ]);
});

// Cash & Bank with auth
app.get('/cash-bank/accounts/:businessId', (req, res) => {
  res.json([
    { id: '1', name: 'Cash in Hand', balance: 25000, type: 'Cash' },
    { id: '2', name: 'SBI Account', balance: 75000, type: 'Bank' }
  ]);
});

app.get('/cash-bank/transactions/:businessId', (req, res) => {
  res.json([
    { id: '1', date: '2024-01-15', type: 'Credit', amount: 10000 },
    { id: '2', date: '2024-01-14', type: 'Debit', amount: 5000 }
  ]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(3001, () => {
  console.log('Backend API running on port 3001');
});
