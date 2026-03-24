import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _dmSans = DM_Sans({ subsets: ["latin"], variable: '--font-sans' });
const _dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: '--font-serif' });

export const metadata: Metadata = {
  title: "MatriLine - Your Mental Health Companion",
  description:
    "AI-powered mental wellness platform designed for women. Track your mood, connect with community, and access professional support.",

  icons: {
    icon: [
      {
        url: "/heart.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/heart.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/heart.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/heart.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_dmSans.variable} ${_dmSerif.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
