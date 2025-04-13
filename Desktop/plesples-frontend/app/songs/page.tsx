"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import SongCard from "@/components/song-card"
import { getAllSongs, SongMetadata } from "@/lib/song-service"

export default function SongsPage() {
  const [songs, setSongs] = useState<SongMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSongs() {
      try {
        setIsLoading(true)
        setError(null)
        const songList = await getAllSongs()
        setSongs(songList)
      } catch (error) {
        console.error("Failed to load songs:", error)
        setError("Failed to load songs. Please check if the backend server is running.")
      } finally {
        setIsLoading(false)
      }
    }

    loadSongs()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <header className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-pink-500 retro-font">Select a Song</h1>
          <Link 
            href="/" 
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold retro-font transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 mb-8 text-center">
            <p className="text-xl text-red-300 mb-4">{error}</p>
            <p className="text-white">
              Make sure the backend server is running at <code className="bg-gray-800 px-2 py-1 rounded">http://127.0.0.1:5000</code>
            </p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-2xl text-gray-400 animate-pulse">Loading songs...</p>
          </div>
        ) : songs.length === 0 && !error ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-xl text-gray-400 mb-4">No songs found</p>
            <p className="text-gray-500">The backend returned an empty list of songs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map((song) => (
              <SongCard 
                key={song.id}
                id={song.id}
                title={song.title}
                artist={song.artist}
                difficulty={song.difficulty}
                coverImage={song.coverImage}
                bpm={song.bpm}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 