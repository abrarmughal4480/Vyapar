import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNavigation from '../components/BottomNavigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Header for mobile */}
        <div className="lg:hidden">
          <Header />
        </div>
        
        {/* Main content */}
        <main className="pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  )
}
