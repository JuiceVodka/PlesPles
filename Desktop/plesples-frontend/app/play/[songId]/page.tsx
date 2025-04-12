"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DDRGame from "@/components/ddr-game"
import { getSongById } from "@/lib/song-service"

interface PlayPageProps {
  params: {
    songId: string
  }
}

export default function PlayPage({ params }: PlayPageProps) {
  const { songId } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function validateSong() {
      try {
        const song = await getSongById(songId)
        if (!song) {
          setError("Song not found")
          setTimeout(() => {
            router.push("/songs")
          }, 3000)
        }
      } catch (err) {
        setError("Failed to load song")
        setTimeout(() => {
          router.push("/songs")
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    validateSong()
  }, [songId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl animate-pulse">Loading game...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl text-red-400 mb-4">{error}</p>
        <p className="text-gray-400">Redirecting back to song selection...</p>
      </div>
    )
  }

  return <DDRGame songId={parseInt(songId, 10)} />
} 