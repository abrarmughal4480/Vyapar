import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vypar - Business Management App',
  description: 'Complete business management solution for inventory, sales, and customers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
