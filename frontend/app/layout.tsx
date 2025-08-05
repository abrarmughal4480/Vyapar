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
      </body>
    </html>
  )
}
