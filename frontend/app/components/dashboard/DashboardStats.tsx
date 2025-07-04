export default function DashboardStats() {
  const stats = [
    {
      title: 'Total Sales',
      value: '₹2,45,680',
      change: '+12.5%',
      changeType: 'increase',
      icon: '💰',
      period: 'This month',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Purchase',
      value: '₹1,25,400',
      change: '+8.2%',
      changeType: 'increase',
      icon: '🛒',
      period: 'This month',
      gradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Profit/Loss',
      value: '₹1,20,280',
      change: '+15.3%',
      changeType: 'increase',
      icon: '📊',
      period: 'This month',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Pending Payments',
      value: '₹45,500',
      change: '-5.1%',
      changeType: 'decrease',
      icon: '⏳',
      period: 'Outstanding',
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:scale-105 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-10 -mt-10`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-lg flex items-center justify-center shadow-lg`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                stat.changeType === 'increase' 
                  ? 'text-green-700 bg-green-100' 
                  : 'text-red-700 bg-red-100'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.period}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
