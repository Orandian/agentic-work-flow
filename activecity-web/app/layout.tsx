import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ActiveCity Staff Portal',
  description: 'Internal portal for city government employees',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={plusJakartaSans.variable}
      style={
        {
          '--font-display': 'var(--font-plus-jakarta)',
          '--font-body': 'var(--font-plus-jakarta)',
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
