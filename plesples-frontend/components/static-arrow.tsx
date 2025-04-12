import Image from "next/image"

interface StaticArrowProps {
  direction: string
}

export default function StaticArrow({ direction }: StaticArrowProps) {
  const getArrowImage = () => {
    switch (direction) {
      case "up":
        return "/images/up_empty.png"
      case "down":
        return "/images/down_empty.png"
      case "left":
        return "/images/left_empty.png"
      case "right":
        return "/images/right_empty.png"
      default:
        return "/images/up_empty.png"
    }
  }

  return (
    <div className="w-40 h-40 flex items-center justify-center">
      <div className="relative w-36 h-36">
        <Image src={getArrowImage() || "/placeholder.svg"} alt={`${direction} arrow`} fill className="object-contain" />
      </div>
    </div>
  )
}
