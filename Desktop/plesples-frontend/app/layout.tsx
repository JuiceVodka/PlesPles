import type { Metadata } from "next"
import { Inter, Audiowide } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const audiowide = Audiowide({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
})

export const metadata: Metadata = {
  title: "Dance Dance Revolution",
  description: "A DDR-style rhythm game built with Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${audiowide.variable} bg-gray-900 text-white`}>{children}</body>
    </html>
  )
}


import './globals.css'