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
  const [maxCombo, setMaxCombo] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [perfectHits, setPerfectHits] = useState(0)
  const [greatHits, setGreatHits] = useState(0)
  const [goodHits, setGoodHits] = useState(0)
  const [missedHits, setMissedHits] = useState(0)
  const [totalArrows, setTotalArrows] = useState(0)
  const [showGifBackground, setShowGifBackground] = useState(false)
  const [showOnFire, setShowOnFire] = useState(false)
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
  const [hitFeedback, setHitFeedback] = useState<{ text: string; color: string; direction: string } | null>(null)
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
  const missedArrowsRef = useRef<Set<number>>(new Set())

  // Define the hit line position (y-coordinate where the static arrows are)
  const HIT_LINE_POSITION = 30
  const MISS_POSITION = 150 // Increased for more forgiving gameplay - gives players more time to hit arrows

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

  // Update score and check for GIF background
  const updateScore = (newScore: number) => {
    setScore(newScore)
    if (newScore >= 1000 && !showGifBackground) {
      setShowGifBackground(true)
      setShowOnFire(true)
      setTimeout(() => {
        setShowOnFire(false)
      }, 3000)
    }
  }

  // Modify the processArrowHit function to include direction in hit feedback
  const processArrowHit = useCallback((direction: string) => {
    // Find arrows of the matching direction that aren't already marked as missed or fading out
    const matchingArrows = activeArrows.filter(
      (arrow) => arrow.direction === direction && !arrow.isFadingOut && !arrow.isMissed,
    )

    if (matchingArrows.length === 0) {
      return;
    }

    // Calculate distance to hit line for each arrow
    const arrowsWithDistance = matchingArrows.map((arrow) => ({
      ...arrow,
      distance: Math.abs(arrow.yPosition - HIT_LINE_POSITION),
    }))

    // Sort by closest to hit line
    arrowsWithDistance.sort((a, b) => a.distance - b.distance)

    const closestArrow = arrowsWithDistance[0]

    // Define hit zones based on distance to hit line (in pixels)
    // Increased hit zones for easier gameplay
    if (closestArrow.distance <= 25) {
      // Perfect hit - precise threshold for truly perfect hits
      updateScore(score + 100)
      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo)
      }
      setPerfectHits(prev => prev + 1)
      setHitFeedback({ text: "PERFECT!", color: "text-yellow-300", direction: closestArrow.direction })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else if (closestArrow.distance <= 50) {
      // Great hit - expanded zone
      updateScore(score + 50)
      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo)
      }
      setGreatHits(prev => prev + 1)
      setHitFeedback({ text: "GREAT!", color: "text-green-400", direction: closestArrow.direction })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else if (closestArrow.distance <= 85) {
      // Good hit - significantly larger zone for more forgiving gameplay
      updateScore(score + 10)
      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo)
      }
      setGoodHits(prev => prev + 1)
      setHitFeedback({ text: "GOOD", color: "text-blue-400", direction: closestArrow.direction })
      setActiveArrows((prev) =>
        prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
      )
    } else {
      return;
    }

    // Remove the arrow after the animation completes
    setTimeout(() => {
      setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
    }, 300)

    // Clear feedback after a delay
    setTimeout(() => {
      setHitFeedback(null)
    }, 500)
  }, [activeArrows, HIT_LINE_POSITION, score, combo, maxCombo])

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

      // Update pressed keys state for visual feedback only
      setPressedKeys((prev) => ({ ...prev, [direction]: true }))
      
      // Process arrow hit
      processArrowHit(direction)
    },
    [gameStarted, router, processArrowHit]
  )

  // WebSocket message handler
  const handleSocketMessage = useCallback((event: MessageEvent) => {
    // event.data is in the form {"direction": "left"}
    const direction = JSON.parse(event.data)['direction']
    
    if (!["left", "down", "up", "right"].includes(direction)) {
      console.log('Invalid direction received:', direction)
      return
    }

    // Update pressed keys state for visual feedback only
    setPressedKeys((prev) => ({ ...prev, [direction]: true }))
    
    // Process arrow hit
    processArrowHit(direction)
    
    // Reset pressed key state after a short delay
    setTimeout(() => {
      setPressedKeys((prev) => ({ ...prev, [direction]: false }))
    }, 100)
  }, [processArrowHit])

  // Handle WebSocket messages for arrow inputs
  useEffect(() => {
    if (!gameStarted || !socket) return

    socket.addEventListener('message', handleSocketMessage)
    
    return () => {
      socket.removeEventListener('message', handleSocketMessage)
    }
  }, [gameStarted, handleSocketMessage, socket])

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

  // Reset showGifBackground when game starts
  const startGame = () => {
    setGameStarted(true)
    setGameCompleted(false)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setPerfectHits(0)
    setGreatHits(0)
    setGoodHits(0)
    setMissedHits(0)
    setActiveArrows([])
    setHitFeedback(null)
    setShowGifBackground(false)
    setShowOnFire(false)
    processingArrowsRef.current = new Set()
    missedArrowsRef.current.clear()
    
    // Start playing audio
    if (audioElement) {
      audioElement.currentTime = 0
      audioElement.play()
      gameStartTimeRef.current = Date.now()
    }
  }

  // Calculate accuracy percentage
  const calculateAccuracy = (): number => {
    const totalHits = perfectHits + greatHits + goodHits + missedHits;
    if (totalHits === 0) return 0;
    
    // Weight perfect hits more than others
    const weightedScore = (perfectHits * 100 + greatHits * 75 + goodHits * 50) / totalHits;
    return Math.round(weightedScore);
  }

  // Get rank based on accuracy
  const getRank = (): string => {
    const accuracy = calculateAccuracy();
    
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
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

    // Clear the missed arrows ref when game starts
    missedArrowsRef.current.clear()

    const interval = setInterval(() => {
      setActiveArrows((prev) => {
        // Update positions
        const updatedArrows = prev.map((arrow) => {
          // Don't move arrows that are fading out
          if (arrow.isFadingOut) return arrow

          const newPosition = arrow.position + 1 // Speed of arrows moving up

          // Check if the arrow has passed the hit zone without being hit
          // and hasn't been marked as missed yet
          if (newPosition > MISS_POSITION && !arrow.isMissed && !arrow.isFadingOut) {
            // Only show miss feedback once per arrow
            if (!missedArrowsRef.current.has(arrow.id)) {
              missedArrowsRef.current.add(arrow.id)
              setCombo(0) // Break combo for missed arrows
              setMissedHits(prev => prev + 1)
              setHitFeedback({ text: "MISS!", color: "text-red-500", direction: arrow.direction })
              setTimeout(() => {
                setHitFeedback(null)
              }, 500)
            }
            
            // Mark as missed but keep it moving
            return {
              ...arrow,
              position: newPosition,
              yPosition: calculateArrowYPosition(newPosition),
              isMissed: true,
            }
          }

          // If arrow is already marked as missed, just keep it moving
          if (arrow.isMissed) {
            return {
              ...arrow,
              position: newPosition,
              yPosition: calculateArrowYPosition(newPosition),
            }
          }

          // Normal arrow movement
          return {
            ...arrow,
            position: newPosition,
            yPosition: calculateArrowYPosition(newPosition),
          }
        })

        // Remove arrows that are completely off screen - very high threshold
        // so missed arrows remain visible much longer
        const filteredArrows = updatedArrows.filter((arrow) => {
          return arrow.position <= 200; // Very high threshold to keep them visible longer
        })

        return filteredArrows
      })
    }, 16) // ~60fps

    return () => {
      clearInterval(interval)
      missedArrowsRef.current.clear()
    }
  }, [gameStarted, MISS_POSITION])

  // Add audio ended event listener to detect when song is complete
  useEffect(() => {
    if (!audioElement || !gameStarted) return;

    const handleAudioEnded = () => {
      // Wait a bit to allow any final arrows to be processed
      setTimeout(() => {
        setGameCompleted(true);
      }, 1000);
    };

    audioElement.addEventListener('ended', handleAudioEnded);

    return () => {
      audioElement.removeEventListener('ended', handleAudioEnded);
    };
  }, [audioElement, gameStarted]);

  // Count total arrows when song data is loaded
  useEffect(() => {
    if (!songData) return;

    let count = 0;
    songData.steps.forEach(step => {
      step.arrows.forEach(arrow => {
        if (arrow > 0) count++;
      });
    });
    
    setTotalArrows(count);
  }, [songData]);

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
    <div className="flex flex-col items-center justify-center h-screen w-screen overflow-hidden relative">
      {/* Background GIF - only show when score >= 100 */}
      {showGifBackground && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black pointer-events-none">
          <img 
            src="/images/dance.gif" 
            alt="Game background" 
            className="h-full w-auto object-contain"
          />
        </div>
      )}

      {/* On Fire text */}
      {showOnFire && (
        <div className="absolute right-1/4 top-1/3 transform -translate-y-1/2 z-30">
          <div className="text-6xl font-bold text-yellow-400 retro-font animate-bounce">
            ON FIRE!
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20">
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
      <div className="absolute top-4 right-4 z-30">
        <button 
          onClick={() => router.push('/songs')} 
          className="bg-gray-800 px-6 py-2 rounded-lg border-2 border-gray-700 shadow-md retro-font hover:bg-gray-700 transition-colors"
        >
          Back to Songs
        </button>
      </div>

      

      {/* Input method indicator
      {gameStarted && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-800/80 px-4 py-1 rounded-full border border-gray-700 shadow-md">
            <p className="text-sm text-gray-300 retro-font">
              {useKeyboard ? "KEYBOARD MODE" : socket ? "DANCE PAD CONNECTED" : "KEYBOARD MODE"}
            </p>
          </div>
        </div>
      )} */}

      {!gameStarted ? (
        <div className="flex flex-col items-center z-20">
          <h1 className="text-5xl font-bold mb-6 text-pink-500 retro-font animate-glow">PlesPles</h1>
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
      ) : gameCompleted ? (
        <div className="flex flex-col items-center justify-center bg-gray-900/90 rounded-lg p-8 border-4 border-pink-500 shadow-2xl max-w-2xl z-50">
          <h2 className="text-5xl font-bold mb-6 text-pink-500 retro-font animate-glow">Game Complete!</h2>
          
          <div className="bg-gray-800 p-6 rounded-lg w-full mb-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl retro-font text-white mb-2">{songData?.metadata.title}</h3>
                <p className="text-gray-400">Final Score:</p>
              </div>
              <div className="text-5xl retro-font text-pink-400">{score}</div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-300">Accuracy:</p>
              <p className="text-2xl retro-font text-blue-400">{calculateAccuracy()}%</p>
            </div>
            
            <div className="flex justify-between items-center mb-8">
              <p className="text-gray-300">Rank:</p>
              <p className="text-6xl retro-font text-yellow-400">{getRank()}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-pink-300 retro-font">Max Combo:</p>
                <p className="text-2xl text-white">{maxCombo}</p>
              </div>
              <div>
                <p className="text-yellow-300 retro-font">Perfect:</p>
                <p className="text-2xl text-white">{perfectHits}</p>
              </div>
              <div>
                <p className="text-green-400 retro-font">Great:</p>
                <p className="text-2xl text-white">{greatHits}</p>
              </div>
              <div>
                <p className="text-blue-400 retro-font">Good:</p>
                <p className="text-2xl text-white">{goodHits}</p>
              </div>
              <div>
                <p className="text-red-500 retro-font">Miss:</p>
                <p className="text-2xl text-white">{missedHits}</p>
              </div>
              <div>
                <p className="text-gray-300 retro-font">Total:</p>
                <p className="text-2xl text-white">{totalArrows}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={startGame}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white text-xl font-bold rounded-lg shadow-lg transition-colors retro-font"
            >
              Play Again
            </button>
            <button 
              onClick={() => router.push('/songs')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold rounded-lg shadow-lg transition-colors retro-font"
            >
              Song Select
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={gameContainerRef}
          className="relative w-full h-full border-4 border-gray-700 bg-gray-800/50 overflow-hidden shadow-2xl shadow-pink-500/20 z-10 pointer-events-auto"
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

          {/* Hit line - removed animation for better performance */}
          <div className="absolute top-[160px] left-0 right-0 h-[10px] bg-pink-500 shadow-lg shadow-pink-500/50" />

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
            <div className="absolute top-[180px] left-0 right-0 flex justify-center pointer-events-none">
              <div 
                className={`text-4xl font-bold retro-font ${hitFeedback.color} animate-feedback shadow-lg`}
                style={{
                  position: 'absolute',
                  left: getDirectionOffset(hitFeedback.direction),
                  transform: 'translateX(-100%)',
                  width: 'auto',
                  textAlign: 'center'
                }}
              >
                {hitFeedback.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}