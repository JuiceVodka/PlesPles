import Image from "next/image"
import { cn } from "@/lib/utils"

interface GameArrowProps {
  direction: string
  active?: boolean
}

export default function GameArrow({ direction, active = false }: GameArrowProps) {
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

  return (
    <div className="w-40 h-40 flex items-center justify-center">
      <div className={cn("relative w-36 h-36 transition-transform duration-100", active && "scale-125")}>
        <Image src={getArrowImage() || "/placeholder.svg"} alt={`${direction} arrow`} fill className="object-contain" />
      </div>
    </div>
  )
}
