import type { Metadata } from 'next'
import Navbar from '../components/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shopkins Collector Hub',
  description: 'Track and catalog your Shopkins collection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-pink-50 antialiased min-h-screen text-gray-800">
        <Navbar />
        {children}
      </body>
    </html>
  )
}
