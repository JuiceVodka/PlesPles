"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import StaticArrow from "@/components/static-arrow"
import MovingArrow from "@/components/moving-arrow"
import { useRouter } from "next/navigation"
import { config } from '@/lib/config';
import { getSongData, getSongById } from '@/lib/song-service';

// Shared function to ensure consistent positioning between top and moving arrows
function getDirectionOffset(direction: string): string {
  switch (direction) {
    case "left":
      return "calc(50% - 300px)"
    case "down":
      return "calc(50% - 100px)"
    case "up":
      return "calc(50% + 100px)"
    case "right":
      return "calc(50% + 300px)"
    default:
      return "50%"
  }
}

// Interface for song data
interface SongData {
  metadata: {
    title: string
    bpm: number
    audio: string
    offset: number
    bpms: [number, number][]
  }
  steps: {
    beat: number
    arrows: number[]
  }[]
}

interface DDRGameProps {
  songId: number
  socket: WebSocket | null
  useKeyboard?: boolean
}

export default function DDRGame({ songId, socket, useKeyboard = false }: DDRGameProps) {
  const router = useRouter()
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [activeArrows, setActiveArrows] = useState<
    Array<{
      id: number
      direction: string
      position: number
      yPosition: number
      isFadingOut?: boolean
      isMissed?: boolean
    }>
  >([])
  const [nextArrowId, setNextArrowId] = useState(0)
  const [hitFeedback, setHitFeedback] = useState<{ text: string; color: string } | null>(null)
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({
    left: false,
    down: false,
    up: false,
    right: false,
  })
  const [songData, setSongData] = useState<SongData | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameStartTimeRef = useRef<number>(0)
  const processingArrowsRef = useRef<Set<number>>(new Set())

  // Define the hit line position (y-coordinate where the static arrows are)
  const HIT_LINE_POSITION = 30
  const MISS_POSITION = 105 // Position percentage where arrows are considered missed

  const directions = ["left", "down", "up", "right"]

  // Calculate the actual Y position of arrows in pixels
  const calculateArrowYPosition = (position: number): number => {
    if (!gameContainerRef.current) return 0

    const containerHeight = gameContainerRef.current.clientHeight
    // Convert percentage position to actual pixel position from the bottom
    return containerHeight - (containerHeight * position) / 100
  }

  // Load song data
  useEffect(() => {
    const loadSongData = async () => {
      try {
        // Get song data using the service function
        const data = await getSongData(songId);
        if (!data) {
          throw new Error("Failed to fetch song data");
        }
        setSongData(data);
        
        // Get song metadata for additional info
        const songInfo = await getSongById(songId);
        
        if (songInfo && data.metadata.audio) {
          // Preload audio from the backend
          const audio = new Audio(`${config.api.baseUrl}/songs/${data.metadata.audio || 'songs/default.ogg'}`);
          setAudioElement(audio);
        } else {
          console.warn("Audio file not found in song metadata");
        }
      } catch (error) {
        console.error("Failed to load song data:", error);
      }
    };
    
    loadSongData();
  }, [songId]);

  // Shared function to process arrow hits - MOVED BEFORE handleKeyDown to avoid circular dependency
  const processArrowHit = useCallback((direction: string) => {
    // Find arrows of the matching direction
    const matchingArrows = activeArrows.filter(
      (arrow) => arrow.direction === direction && !arrow.isFadingOut && !arrow.isMissed,
    )

    if (matchingArrows.length === 0) {
      // No arrows of this direction - simply ignore the key press
      // Don't count as a miss or affect combo
      return
    }

    // Calculate distance to hit line for each arrow
    const arrowsWithDistance = matchingArrows.map((arrow) => ({
      ...arrow,
      // Distance from the arrow to the hit line (absolute value)
      distance: Math.abs(arrow.yPosition - HIT_LINE_POSITION),
    }))

    // Sort by closest to hit line
    arrowsWithDistance.sort((a, b) => a.distance - b.distance)

    const closestArrow = arrowsWithDistance[0]

    // Define hit zones based on distance to hit line (in pixels)
    if (closestArrow.distance <= 15) {
      // Perfect hit
      setScore((prev) => prev + 100)
      setCombo((prev) => prev + 1)
      setHitFeedback({ text: "PERFECT!", color: "text-yellow-300" })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else if (closestArrow.distance <= 30) {
      // Great hit
      setScore((prev) => prev + 50)
      setCombo((prev) => prev + 1)
      setHitFeedback({ text: "GREAT!", color: "text-green-400" })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else if (closestArrow.distance <= 45) {
      // Good hit
      setScore((prev) => prev + 10)
      setCombo((prev) => prev + 1)
      setHitFeedback({ text: "GOOD", color: "text-blue-400" })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else {
      //Miss - arrow too far from hit line
      setCombo(0)
      setHitFeedback({ text: "MISS!", color: "text-red-500" })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true, isMissed: true } : arrow)),
      )
    }

    // Remove the arrow after the animation completes
    setTimeout(() => {
      setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
    }, 300)

    // Clear feedback after a delay
    setTimeout(() => {
      setHitFeedback(null)
    }, 500)
  }, [activeArrows, HIT_LINE_POSITION])

  // Handle WebSocket messages for arrow inputs
  useEffect(() => {
    if (!gameStarted || !socket) return

    const handleSocketMessage = (event: MessageEvent) => {
      // event.data is in the form {"direction": "left"}
      const direction = JSON.parse(event.data)['direction']
      
      if (!["left", "down", "up", "right"].includes(direction)) {
        console.log('Invalid direction received:', direction)
        return
      }

      // Update pressed keys state
      setPressedKeys((prev) => ({ ...prev, [direction]: true }))
      
      // Process arrow hit
      processArrowHit(direction)
      
      // Reset pressed key state after a short delay
      setTimeout(() => {
        setPressedKeys((prev) => ({ ...prev, [direction]: false }))
      }, 100)
    }

    socket.addEventListener('message', handleSocketMessage)
    
    return () => {
      socket.removeEventListener('message', handleSocketMessage)
    }
  }, [gameStarted, processArrowHit, socket])

  // Keyboard input handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gameStarted) return

      let direction = ""

      switch (e.key) {
        case "ArrowLeft":
          direction = "left"
          break
        case "ArrowDown":
          direction = "down"
          break
        case "ArrowUp":
          direction = "up"
          break
        case "ArrowRight":
          direction = "right"
          break
        case "Escape":
          // Exit game
          router.push("/songs")
          return
        default:
          return
      }

      // Update pressed keys state
      setPressedKeys((prev) => ({ ...prev, [direction]: true }))
      
      // Process arrow hit
      processArrowHit(direction)
    },
    [gameStarted, router, processArrowHit]
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    let direction = ""

    switch (e.key) {
      case "ArrowLeft":
        direction = "left"
        break
      case "ArrowDown":
        direction = "down"
        break
      case "ArrowUp":
        direction = "up"
        break
      case "ArrowRight":
        direction = "right"
        break
      default:
        return
    }

    setPressedKeys((prev) => ({ ...prev, [direction]: false }))
  }, [])

  // Set up keyboard event listeners when in keyboard mode
  useEffect(() => {
    if (!gameStarted) return
    
    // Only add keyboard handlers if we're in keyboard mode or as fallback
    if (useKeyboard || !socket) {
      window.addEventListener("keydown", handleKeyDown)
      window.addEventListener("keyup", handleKeyUp)
      
      return () => {
        window.removeEventListener("keydown", handleKeyDown)
        window.removeEventListener("keyup", handleKeyUp)
      }
    } else {
      // If we're not in keyboard mode, still listen for escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          router.push("/songs")
        }
      }
      
      window.addEventListener("keydown", handleEscape)
      return () => {
        window.removeEventListener("keydown", handleEscape)
      }
    }
  }, [gameStarted, router, useKeyboard, socket, handleKeyDown, handleKeyUp])

  // Game start function
  const startGame = () => {
    setGameStarted(true)
    setScore(0)
    setCombo(0)
    setActiveArrows([])
    setHitFeedback(null)
    processingArrowsRef.current = new Set()
    
    // Start playing audio
    if (audioElement) {
      audioElement.currentTime = 0
      audioElement.play()
      gameStartTimeRef.current = Date.now()
    }
  }

  // Process song data and spawn arrows at the correct times
  useEffect(() => {
    if (!gameStarted || !songData) return

    const bpm = songData.metadata.bpm
    const msPerBeat = 60000 / bpm
    
    // Define arrow type
    type ArrowType = {
      id: number
      direction: string
      position: number
      yPosition: number
      isFadingOut?: boolean
      isMissed?: boolean
    }
    
    let lastArrowId = nextArrowId;
    
    // Scheduler function to check and spawn arrows
    const scheduler = setInterval(() => {
      const currentTime = Date.now() - gameStartTimeRef.current
      
      songData.steps.forEach((step) => {
        // Skip steps we've already processed
        if (processingArrowsRef.current.has(step.beat)) return
        
        // Calculate when this beat should happen
        const beatTime = step.beat * msPerBeat
        
        // If it's time (or past time) to show this arrow
        if (currentTime >= beatTime - 2000) { // 2000ms is time for arrow to travel to hit line
          // Create arrows for this step - only for non-zero values
          let newArrows: ArrowType[] = [];
          
          for (let dirIndex = 0; dirIndex < step.arrows.length; dirIndex++) {
            const arrowType = step.arrows[dirIndex];
            if (arrowType > 0) {
              const newArrow = {
                id: lastArrowId++,
                direction: directions[dirIndex],
                position: 0,
                yPosition: calculateArrowYPosition(0)
              };
              newArrows.push(newArrow);
            }
          }
          
          // Add new arrows to active arrows
          if (newArrows.length > 0) {
            setActiveArrows(prev => [...prev, ...newArrows]);
          }
          
          // Mark this beat as processed
          processingArrowsRef.current.add(step.beat);
          
          // Update next arrow ID
          setNextArrowId(lastArrowId);
        }
      })
    }, 16)
    
    return () => clearInterval(scheduler)
  }, [gameStarted, songData, nextArrowId, directions])

  // Move arrows up
  useEffect(() => {
    if (!gameStarted) return

    const interval = setInterval(() => {
      setActiveArrows((prev) => {
        // Update positions
        const updatedArrows = prev.map((arrow) => {
          // Don't move arrows that are fading out or missed
          if (arrow.isFadingOut || arrow.isMissed) return arrow

          const newPosition = arrow.position + 1 // Speed of arrows moving up

          // Check if the arrow has passed the hit zone without being hit
          if (newPosition > MISS_POSITION && !arrow.isMissed && !arrow.isFadingOut) {
            // Mark as missed but leave on screen
            setCombo(0) // Break combo for missed arrows
            setHitFeedback({ text: "MISS!", color: "text-red-500" })
            setTimeout(() => {
              setHitFeedback(null)
            }, 500)
            
            return {
              ...arrow,
              position: newPosition,
              yPosition: calculateArrowYPosition(newPosition),
              isMissed: true,
            }
          }

          return {
            ...arrow,
            position: newPosition,
            yPosition: calculateArrowYPosition(newPosition),
          }
        })

        // Remove arrows that are completely off screen
        // (much higher than needed to see them, but keep missed arrows on screen longer)
        const filteredArrows = updatedArrows.filter((arrow) => {
          // Only remove arrows that are way past the top of the screen (position > 150)
          return arrow.position <= 150;
        })

        return filteredArrows
      })
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [gameStarted, MISS_POSITION])

  // Update arrow Y positions when container size changes
  useEffect(() => {
    if (!gameStarted) return

    const handleResize = () => {
      setActiveArrows((prev) =>
        prev.map((arrow) => {
          if (arrow.isFadingOut || arrow.isMissed) return arrow
          return {
            ...arrow,
            yPosition: calculateArrowYPosition(arrow.position),
          }
        }),
      )
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [gameStarted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }
    }
  }, [audioElement])

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <div className="absolute top-4 left-4 z-10">
        <div className="flex flex-col gap-2">
          <div className="text-2xl bg-gray-800 px-6 py-2 rounded-lg border-2 border-gray-700 shadow-md retro-font">
            Score: <span className="font-bold text-pink-400">{score}</span>
          </div>
          <div className="text-2xl bg-gray-800 px-6 py-2 rounded-lg border-2 border-gray-700 shadow-md retro-font">
            Combo: <span className="font-bold text-blue-400">{combo}</span>
          </div>
        </div>
      </div>

      {/* Back button in top right */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => router.push('/songs')} 
          className="bg-gray-800 px-6 py-2 rounded-lg border-2 border-gray-700 shadow-md retro-font hover:bg-gray-700 transition-colors"
        >
          Back to Songs
        </button>
      </div>

      {/* Input method indicator */}
      {gameStarted && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800/80 px-4 py-1 rounded-full border border-gray-700 shadow-md">
            <p className="text-sm text-gray-300 retro-font">
              {useKeyboard ? "KEYBOARD MODE" : socket ? "DANCE PAD CONNECTED" : "KEYBOARD MODE"}
            </p>
          </div>
        </div>
      )}

      {!gameStarted ? (
        <div className="flex flex-col items-center">
          <h1 className="text-5xl font-bold mb-6 text-pink-500 retro-font animate-glow">DANCE DANCE REVOLUTION</h1>
          <div className="mb-6 text-xl text-center">
            <p className="text-2xl font-bold text-pink-300 retro-font">
              {songData ? `Now Playing: ${songData.metadata.title}` : 'Loading song...'}
            </p>
            <p className="text-gray-400">
              {songData ? `BPM: ${songData.metadata.bpm}` : ''}
            </p>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-2xl font-bold mb-6 transition-transform hover:scale-105 shadow-lg retro-font"
            disabled={!songData}
          >
            START GAME
          </button>

          <div className="grid grid-cols-2 gap-6 text-lg text-gray-300 max-w-2xl">
            <div>
              <h3 className="font-bold mb-2 text-pink-400 retro-font">SCORING</h3>
              <p className="retro-font text-sm">Perfect: 100 points</p>
              <p className="retro-font text-sm">Great: 50 points</p>
              <p className="retro-font text-sm">Good: 10 points</p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-pink-400 retro-font">CONTROLS</h3>
              <p className="retro-font text-sm">{useKeyboard || !socket ? "Use the arrow keys" : "Use the dance pad"}</p>
              <p className="retro-font text-sm">ESC to exit game</p>
              <p className="retro-font text-sm">Build combos for higher scores!</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={gameContainerRef}
          className="relative w-full h-full border-4 border-gray-700 bg-gray-800 overflow-hidden shadow-2xl shadow-pink-500/20"
        >
          {/* Target zone at the top */}
          <div className="absolute top-0 left-0 right-0 h-[160px] bg-gray-700/30 border-b-2 border-gray-600">
            {/* Static arrows at the top - using absolute positioning for perfect alignment */}
            {directions.map((direction) => (
              <div
                key={direction}
                className="absolute top-[10px]"
                style={{
                  left: getDirectionOffset(direction),
                  transform: "translateX(-50%)",
                }}
              >
                <StaticArrow direction={direction} />
              </div>
            ))}
          </div>

          {/* Hit line */}
          <div className="absolute top-[160px] left-0 right-0 h-[8px] bg-pink-500 shadow-lg" />

          {/* Moving arrows */}
          {activeArrows.map((arrow) => (
            <MovingArrow
              key={arrow.id}
              direction={arrow.direction}
              position={arrow.position}
              isPressed={pressedKeys[arrow.direction]}
              isFadingOut={arrow.isFadingOut}
              isMissed={arrow.isMissed}
            />
          ))}

          {/* Hit feedback */}
          {hitFeedback && (
            <div className="absolute top-1/3 left-0 right-0 flex justify-center">
              <div className={`text-6xl retro-font ${hitFeedback.color} animate-feedback shadow-lg`}>
                {hitFeedback.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}