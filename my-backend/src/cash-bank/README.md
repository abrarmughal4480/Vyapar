# Cash & Bank Management Module

## Overview
The Cash & Bank Management module provides comprehensive financial management capabilities for the Vypar business management platform. It enables businesses to track cash flows, manage multiple accounts, and maintain detailed transaction records.

## Real API Integration

### Environment Setup
Ensure your backend is running on `http://localhost:3001` with the following environment variables:
```env
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-connection-string
```

### Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Features

### Account Management
- **Multiple Account Types**: Support for Cash and Bank accounts
- **Account Details**: Store account numbers, bank details, and balances
- **Real-time Balance Tracking**: Automatic balance updates with each transaction
- **Account Categories**: Color-coded organization for easy identification

### Transaction Management
- **Payment In/Out**: Record incoming and outgoing payments
- **Multiple Payment Modes**: Cash, Bank Transfer, UPI, Cheque, Cards
- **Transaction Details**: Party information, descriptions, reference numbers
- **Status Tracking**: Completed, Pending, Failed transaction states

### Transfer Operations
- **Inter-account Transfers**: Move funds between accounts
- **Transfer Validation**: Insufficient balance checks
- **Dual Transaction Recording**: Automatic debit/credit entries

### Analytics & Reporting
- **Account Summary**: Total, cash, and bank balance aggregations
- **Transaction Summary**: Payment in/out totals and net flow
- **Date Range Filtering**: Customizable reporting periods
- **Transaction Breakdown**: Analysis by type and status

## API Endpoints

### Accounts
- `GET /cash-bank/accounts/:businessId` - List all accounts
- `GET /cash-bank/accounts/:businessId/:accountId` - Get specific account
- `POST /cash-bank/accounts/:businessId` - Create new account
- `PUT /cash-bank/accounts/:businessId/:accountId` - Update account
- `DELETE /cash-bank/accounts/:businessId/:accountId` - Delete account

### Transactions
- `GET /cash-bank/transactions/:businessId` - List all transactions
- `GET /cash-bank/transactions/:businessId/:transactionId` - Get specific transaction
- `POST /cash-bank/transactions/:businessId` - Create new transaction
- `PUT /cash-bank/transactions/:businessId/:transactionId` - Update transaction
- `DELETE /cash-bank/transactions/:businessId/:transactionId` - Delete transaction

### Transfers
- `POST /cash-bank/transfer/:businessId` - Transfer funds between accounts

### Analytics
- `GET /cash-bank/summary/accounts/:businessId` - Account summary
- `GET /cash-bank/summary/transactions/:businessId` - Transaction summary

## Error Handling

The API returns standardized error responses:
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Testing the Integration

### 1. Start the Backend
```bash
cd my-backend
npm run start:dev
```

### 2. Start the Frontend
```bash
cd my-app
npm run dev
```

### 3. Login and Navigate
1. Login with valid credentials
2. Navigate to Cash & Bank section
3. Test account creation and transactions

## Troubleshooting

### Common Issues

1. **CORS Error**: Ensure backend allows frontend origin
2. **401 Unauthorized**: Check JWT token validity
3. **Connection Refused**: Verify backend is running on port 3001
4. **Business ID Missing**: Ensure user has proper business association

### Debug Steps

1. Check browser console for error messages
2. Verify API endpoints are responding (use Postman)
3. Check backend logs for detailed error information
4. Ensure database connectivity

## Demo Mode Removal

The demo mode has been completely removed. All operations now connect to the real backend API. Users must have valid authentication and business association to access the module.

## Security Features

- **Business Isolation**: Data is strictly segregated by business ID
- **Authentication Required**: All endpoints require valid JWT tokens
- **Input Validation**: Comprehensive data validation using DTOs
- **Error Sanitization**: Secure error messages without data leakage

## Integration

The Cash & Bank module integrates seamlessly with:
- **Authentication Module**: For user verification
- **Business Module**: For business data association
- **Dashboard**: For financial overview and quick actions
