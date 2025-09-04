import type { Metadata } from 'next'
import ReactQueryProvider from '@/context/ReactQueryProvider'
import { AppProvider } from '../context/Context'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'UHelp',
  description: 'UHelp Front',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="h-screen antialiased overflow-y-auto">
        <ReactQueryProvider>
          <AppProvider>
            {children}
            <Toaster position="top-right" />
          </AppProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
