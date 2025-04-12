"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()

  // Redirect to songs page after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/songs")
    }, 3000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold mb-6 text-pink-500 retro-font animate-glow">DANCE DANCE REVOLUTION</h1>
      <p className="text-2xl mb-12 text-gray-300">A rhythm game experience</p>
      
      <div className="space-y-4">
        <Link 
          href="/songs" 
          className="block px-10 py-3 bg-pink-600 hover:bg-pink-700 text-white text-xl font-bold rounded-lg text-center shadow-lg transition-colors"
        >
          Play Now
        </Link>
        
        <Link 
          href="/about" 
          className="block px-10 py-3 bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold rounded-lg text-center shadow-lg transition-colors"
        >
          About
        </Link>
      </div>

      <p className="mt-20 text-gray-500">Redirecting to song selection in a few seconds...</p>
    </div>
  )
}
