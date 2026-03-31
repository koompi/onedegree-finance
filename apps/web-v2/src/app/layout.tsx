import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OneDegree Finance',
  description: 'ប្រព័ន្ធគ្រប់គ្រឹងហិរញ្ញវត្ថុ SME',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
