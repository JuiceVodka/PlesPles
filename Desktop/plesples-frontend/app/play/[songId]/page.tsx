"use client"

import { useEffect, useState, useRef } from "react"
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
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [usingKeyboard, setUsingKeyboard] = useState(false)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize WebSocket connection with reconnection logic
  const connectWebSocket = () => {
    try {
      console.log('Initializing WebSocket connection to ws://localhost:9876')
      const ws = new WebSocket('ws://localhost:9876')
      
      ws.onopen = () => {
        console.log('WebSocket Connected, readyState:', ws.readyState)
        reconnectAttempts.current = 0
        setSocket(ws)
        
        // Send a test message to verify connection
        try {
          ws.send('connect-test')
          console.log('Test message sent')
        } catch (e) {
          console.error('Failed to send test message:', e)
        }
      }

      ws.onmessage = (event) => {
        console.log('WebSocket message received in page component:', event.data)
      }

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error)
        // Log more details about the current state
        console.error('WebSocket readyState at error:', ws.readyState)
      }

      ws.onclose = (event) => {
        console.log('WebSocket Disconnected', event.code, event.reason, 'readyState:', ws.readyState)
        setSocket(null)
        
        // Try to reconnect unless we've reached max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`)
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, 2000) // Reconnect after 2 seconds
        } else {
          console.log('Max reconnection attempts reached, falling back to keyboard controls')
          setError("Could not connect to dance pad, using keyboard controls")
          setUsingKeyboard(true)
          
          // Clear error after a few seconds
          setTimeout(() => {
            setError(null)
          }, 5000)
        }
      }
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setUsingKeyboard(true)
    }
  }

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket()
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close()
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

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
        <p className="text-2xl animate-pulse retro-font">Loading game...</p>
      </div>
    )
  }

  if (error && !usingKeyboard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl text-red-400 mb-4 retro-font">{error}</p>
        <p className="text-gray-400 retro-font">Redirecting back to song selection...</p>
      </div>
    )
  }

  if (!socket && !usingKeyboard) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl animate-pulse retro-font">Connecting to dance pad...</p>
      </div>
    )
  }

  // If socket connected, use it; otherwise, enable keyboard mode
  return (
    <>
      {error && usingKeyboard && (
        <div className="absolute top-4 left-0 right-0 z-50 flex justify-center">
          <div className="bg-red-900/70 border border-red-500 rounded-lg px-4 py-2 text-center">
            <p className="text-white retro-font">{error}</p>
          </div>
        </div>
      )}
      <DDRGame songId={parseInt(songId, 10)} socket={socket} useKeyboard={usingKeyboard} />
    </>
  )
} 