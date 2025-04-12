import type React from "react"
import "./globals.css"
import type { Metadata } from "next"

import { Audiowide } from "next/font/google"

// Initialize the font
const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Dance Dance Revolution",
  description: "A DDR-style rhythm game",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={audiowide.className}>
      <body>{children}</body>
    </html>
  )
}


import './globals.css'