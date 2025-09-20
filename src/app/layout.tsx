import type { Metadata } from 'next'
import './globals.css'
import '@shopify/polaris/build/esm/styles.css'

export const metadata: Metadata = {
  title: 'Shopify UGC App',
  description: 'User Generated Content management for Shopify stores',
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