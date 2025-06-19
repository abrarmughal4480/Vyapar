'use client'

export default function InventoryPage() {
  const products = [
    { id: 1, name: 'Laptop Dell', category: 'Electronics', stock: 15, price: 45000, status: 'In Stock' },
    { id: 2, name: 'Office Chair', category: 'Furniture', stock: 8, price: 12000, status: 'Low Stock' },
    { id: 3, name: 'Mobile Phone', category: 'Electronics', stock: 25, price: 25000, status: 'In Stock' },
    { id: 4, name: 'Desk Lamp', category: 'Furniture', stock: 0, price: 2500, status: 'Out of Stock' },
  ]

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button className="btn btn-primary">+ Add Product</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">234</div>
          <div className="text-sm text-gray-500">Total Products</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">189</div>
          <div className="text-sm text-gray-500">In Stock</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">32</div>
          <div className="text-sm text-gray-500">Low Stock</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">13</div>
          <div className="text-sm text-gray-500">Out of Stock</div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Products</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {products.map((product) => (
            <div key={product.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">₹{product.price.toLocaleString()}</div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    product.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                    product.status === 'Low Stock' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {product.stock} units
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
