import './globals.css'
import type { Metadata } from 'next'
import { Inter, Roboto } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto'
})

export const metadata: Metadata = {
  title: 'Devease Digital - Business Management App',
  description: 'Complete business management solution for inventory, sales, and customers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${roboto.variable}`}>
        {children}
        
        {/* Global script to remove overlay on pricing page */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function removeOverlayOnPricing() {
                  if (window.location.pathname === '/dashboard/pricing') {
                    const overlay = document.getElementById('buy-plan-overlay');
                    if (overlay) {
                      overlay.remove();
                      console.log('Root layout: Overlay removed from pricing page');
                    }
                  }
                }
                
                // Remove immediately
                removeOverlayOnPricing();
                
                // Check every 100ms
                setInterval(removeOverlayOnPricing, 100);
                
                // Also check on route changes
                let currentPath = window.location.pathname;
                setInterval(function() {
                  if (window.location.pathname !== currentPath) {
                    currentPath = window.location.pathname;
                    removeOverlayOnPricing();
                  }
                }, 100);
              })();
            `
          }}
        />
      </body>
    </html>
  )
}
