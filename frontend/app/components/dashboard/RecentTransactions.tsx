import Link from 'next/link';

export default function RecentTransactions() {
  const transactions = [
    {
      id: 'INV-001',
      type: 'Sale',
      customer: 'Raj Enterprises',
      amount: 15500,
      status: 'Paid',
      date: '2024-01-15'
    },
    {
      id: 'PUR-002',
      type: 'Purchase',
      customer: 'ABC Suppliers',
      amount: -8500,
      status: 'Pending',
      date: '2024-01-14'
    },
    {
      id: 'INV-003',
      type: 'Sale',
      customer: 'XYZ Corp',
      amount: 22000,
      status: 'Partially Paid',
      date: '2024-01-13'
    },
    {
      id: 'INV-004',
      type: 'Sale',
      customer: 'Modern Store',
      amount: 5500,
      status: 'Paid',
      date: '2024-01-12'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Partially Paid':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        <Link href="/reports" className="text-blue-600 text-sm font-medium hover:text-blue-700">
          View All →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
              <th className="pb-2">Transaction ID</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Customer/Supplier</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="text-sm">
                <td className="py-3 font-medium text-blue-600">{transaction.id}</td>
                <td className="py-3">{transaction.type}</td>
                <td className="py-3 text-gray-900">{transaction.customer}</td>
                <td className={`py-3 font-medium ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="py-3 text-gray-500">{transaction.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
