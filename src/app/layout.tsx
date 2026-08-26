import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/query-provider'
import { AppProvider } from '@/components/providers/app-provider'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Fraganus AI — AI Sales Intelligence & Control',
    template: '%s | Fraganus AI',
  },
  description:
    'Fraganus AI — AI nazorat va savdo auditori. amoCRM, OnlinePBX, ChatGPT tahlili (Yozuv → Transkripsiya → AI Score → Chek-list → Xatolar → Tavsiya).',
  keywords: ['Fraganus AI', 'AI аудит', 'продажи', 'amoCRM', 'ChatGPT', 'OnlinePBX', 'контроль качества'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
            />
          </QueryProvider>
        </AppProvider>
      </body>
    </html>
  )
}
