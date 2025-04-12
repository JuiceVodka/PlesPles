"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

interface SongCardProps {
  id: number
  title: string
  artist: string
  difficulty: number
  coverImage?: string
  bpm?: number
}

export default function SongCard({ 
  id, 
  title, 
  artist, 
  difficulty, 
  coverImage = "/images/default-cover.jpg",
  bpm 
}: SongCardProps) {
  const router = useRouter()

  const playSong = () => {
    router.push(`/play/${id}`)
  }

  // Helper to render difficulty stars
  const renderDifficulty = () => {
    const stars = [];
    for (let i = 0; i < difficulty; i++) {
      stars.push(
        <span key={i} className="text-yellow-300">★</span>
      );
    }
    return stars;
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 border-2 border-gray-700">
      <div className="relative h-48 w-full">
        <Image 
          src={coverImage} 
          alt={`${title} cover art`} 
          fill 
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-pink-300 retro-font mb-2 truncate">{title}</h3>
        <p className="text-gray-400 text-sm mb-2">{artist}</p>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            {bpm && <span className="text-gray-400">BPM: {bpm}</span>}
          </div>
          <div className="text-sm">
            {renderDifficulty()}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button 
          onClick={playSong}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg font-bold retro-font transition-colors"
        >
          PLAY
        </button>
      </div>
    </div>
  )
} 