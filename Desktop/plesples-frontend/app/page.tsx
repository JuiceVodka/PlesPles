"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import StaticArrow from "@/components/static-arrow"
import MovingArrow from "@/components/moving-arrow"

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

export default function DDRGame() {
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
  const gameContainerRef = useRef<HTMLDivElement>(null)

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gameStarted) return

      let direction = ""

      switch (e.key) {
        case "ArrowLeft":
          direction = "left"
          setPressedKeys((prev) => ({ ...prev, left: true }))
          break
        case "ArrowDown":
          direction = "down"
          setPressedKeys((prev) => ({ ...prev, down: true }))
          break
        case "ArrowUp":
          direction = "up"
          setPressedKeys((prev) => ({ ...prev, up: true }))
          break
        case "ArrowRight":
          direction = "right"
          setPressedKeys((prev) => ({ ...prev, right: true }))
          break
        default:
          return
      }

      // Find arrows of the matching direction
      const matchingArrows = activeArrows.filter(
        (arrow) => arrow.direction === direction && !arrow.isFadingOut && !arrow.isMissed,
      )

      if (matchingArrows.length === 0) {
        // Miss - no arrows of this direction
        setCombo(0)
        setHitFeedback({ text: "MISS!", color: "text-red-500" })
        setTimeout(() => setHitFeedback(null), 500)
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
        // Perfect hit zone
        // Perfect hit
        setScore((prev) => prev + 100)
        setCombo((prev) => prev + 1)
        setHitFeedback({ text: "PERFECT!", color: "text-yellow-300" })

        // Mark the arrow as fading out instead of removing it immediately
        setActiveArrows((prev) =>
          prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
        )

        // Remove the arrow after the animation completes
        setTimeout(() => {
          setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
        }, 300) // Match this to the animation duration
      } else if (closestArrow.distance <= 30) {
        // Great hit zone
        // Great hit
        setScore((prev) => prev + 50)
        setCombo((prev) => prev + 1)
        setHitFeedback({ text: "GREAT!", color: "text-green-400" })

        // Mark the arrow as fading out instead of removing it immediately
        setActiveArrows((prev) =>
          prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
        )

        // Remove the arrow after the animation completes
        setTimeout(() => {
          setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
        }, 300) // Match this to the animation duration
      } else if (closestArrow.distance <= 45) {
        // Good hit zone
        // Good hit
        setScore((prev) => prev + 10)
        setCombo((prev) => prev + 1)
        setHitFeedback({ text: "GOOD", color: "text-blue-400" })

        // Mark the arrow as fading out instead of removing it immediately
        setActiveArrows((prev) =>
          prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true } : arrow)),
        )

        // Remove the arrow after the animation completes
        setTimeout(() => {
          setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
        }, 300) // Match this to the animation duration
      } else {
        // Miss - arrow too far from hit line
        setCombo(0)
        setHitFeedback({ text: "MISS!", color: "text-red-500" })

        setActiveArrows((prev) =>
          prev.map((arrow) => (arrow.id === closestArrow.id ? { ...arrow, isFadingOut: true, isMissed: true } : arrow)),
        )

        // Remove the arrow after the animation completes
        setTimeout(() => {
          setActiveArrows((prev) => prev.filter((arrow) => arrow.id !== closestArrow.id))
        }, 300) 
      }

      // Clear feedback after a delay
      setTimeout(() => {
        setHitFeedback(null)
      }, 500)
    },
    [activeArrows, gameStarted],
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        setPressedKeys((prev) => ({ ...prev, left: false }))
        break
      case "ArrowDown":
        setPressedKeys((prev) => ({ ...prev, down: false }))
        break
      case "ArrowUp":
        setPressedKeys((prev) => ({ ...prev, up: false }))
        break
      case "ArrowRight":
        setPressedKeys((prev) => ({ ...prev, right: false }))
        break
    }
  }, [])

  const startGame = () => {
    setGameStarted(true)
    setScore(0)
    setCombo(0)
    setActiveArrows([])
    setHitFeedback(null)
  }

  // Generate new arrows
  useEffect(() => {
    if (!gameStarted) return

    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance to spawn an arrow each interval
        const direction = directions[Math.floor(Math.random() * directions.length)]
        setActiveArrows((prev) => [
          ...prev,
          {
            id: nextArrowId,
            direction,
            position: 0, // Start at bottom (0%)
            yPosition: calculateArrowYPosition(0), // Calculate actual Y position
          },
        ])
        setNextArrowId((prev) => prev + 1)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [gameStarted, nextArrowId])

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
            // Mark as missed
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

        // Remove arrows that went past the top or have completed their fade-out animation
        // Keep missed arrows until their animation completes
        const filteredArrows = updatedArrows.filter((arrow) => {
          if (arrow.isMissed) {
            // Schedule removal of missed arrows after animation
            setTimeout(() => {
              setActiveArrows((current) => current.filter((a) => a.id !== arrow.id))
            }, 300)
            return true
          }
          return arrow.position <= 110 || arrow.isFadingOut
        })

        return filteredArrows
      })
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [gameStarted])

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

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

      {!gameStarted ? (
        <div className="flex flex-col items-center">
          <h1 className="text-5xl font-bold mb-6 text-pink-500 retro-font animate-glow">DANCE DANCE REVOLUTION</h1>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-2xl font-bold mb-6 transition-transform hover:scale-105 shadow-lg retro-font"
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
              <p className="retro-font text-sm">Use the arrow keys</p>
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
