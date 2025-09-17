import type { Metadata } from 'next'
import ReactQueryProvider from '@/context/ReactQueryProvider'
import { AppProvider } from '../context/Context'
import { Toaster } from 'react-hot-toast'
import I18nProvider from '../components/I18nProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'UHelp',
  description: 'UHelp Front',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-screen antialiased overflow-y-auto">
        <I18nProvider>
          <ReactQueryProvider>
            <AppProvider>
              {children}
              <Toaster position="top-right" />
            </AppProvider>
          </ReactQueryProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
