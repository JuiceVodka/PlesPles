import Image from "next/image"
import { cn } from "@/lib/utils"

interface MovingArrowProps {
  direction: string
  position: number
  isPressed?: boolean
  isFadingOut?: boolean
  isMissed?: boolean
}

export default function MovingArrow({
  direction,
  position,
  isPressed = false,
  isFadingOut = false,
  isMissed = false,
}: MovingArrowProps) {
  const getArrowImage = () => {
    switch (direction) {
      case "up":
        return "/images/up.png"
      case "down":
        return "/images/bottom.png"
      case "left":
        return "/images/left.png"
      case "right":
        return "/images/right.png"
      default:
        return "/images/up.png"
    }
  }

  // Calculate the vertical position based on the position value (0-100)
  // 0 = bottom of game area, 100 = at the hit line
  const topPosition = `${Math.min(100 - position, 100)}%`

  // Determine if the arrow is in the hit zone (near the hit line)
  // This is just for visual feedback, actual hit detection is in the main component
  const inHitZone = position >= 85 && position <= 100

  return (
    <div
      className="absolute w-40 h-40 flex items-center justify-center"
      style={{
        top: topPosition,
        left: getDirectionOffset(direction),
        transform: "translateX(-50%)",
      }}
    >
      <div
        className={cn(
          "relative w-36 h-36 transition-transform duration-100",
          inHitZone && !isFadingOut && !isMissed && "scale-125",
          isPressed && inHitZone && !isFadingOut && !isMissed && "arrow-glow",
          isFadingOut && "fade-out arrow-glow",
          isMissed && "fade-out arrow-glow-miss",
        )}
      >
        <Image src={getArrowImage() || "/placeholder.svg"} alt={`${direction} arrow`} fill className="object-contain" />
      </div>
    </div>
  )
}

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
