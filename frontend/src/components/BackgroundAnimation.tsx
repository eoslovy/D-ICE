import { useEffect, useRef } from "react"

interface BackgroundAnimationProps {
  count?: number
  shapes?: ("circle" | "square")[]
  speed?: "slow" | "normal" | "fast"
}

export default function BackgroundAnimation({
  count = 15,
  shapes = ["circle", "square"],
  speed = "normal",
}: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const shapesArray: HTMLDivElement[] = []

    // 파랑~하얀색 계열의 아이스 테마 색상 팔레트
    const colors = [
      "#42CAFD", // 밝은 하늘색
      "#E0FFFF", // 라이트 시안
      "#B0E0E6", // 파우더 블루
      "#ADD8E6", // 라이트 블루
      "#87CEEB", // 스카이 블루
      "#00BFFF", // 딥 스카이 블루
      "#1E90FF", // 도저 블루
      "#4682B4", // 스틸 블루
      "#5F9EA0", // 카데트 블루
      "#F0F8FF", // 앨리스 블루
      "#F5FFFA", // 민트 크림
      "#FFFFFF", // 순수한 흰색
      "#F0FFFF", // 아주르
      "#E6F7FF", // 매우 연한 하늘색
      "#CCF2FF", // 연한 하늘색
    ]

    // Speed multiplier
    const speedMultiplier = speed === "slow" ? 1.5 : speed === "fast" ? 0.7 : 1

    // Clear any existing shapes
    container.innerHTML = ""

    // Create new shapes
    for (let i = 0; i < count; i++) {
      const shape = document.createElement("div")
      const size = Math.random() * 80 + 20 // 20-100px
      const color = colors[Math.floor(Math.random() * colors.length)]
      const shapeType = shapes[Math.floor(Math.random() * shapes.length)]

      // Base class for all shapes
      shape.className = "floating-shape"

      // Apply shape-specific styles
      if (shapeType === "square") {
        shape.style.borderRadius = "10px"
      } else {
        // Circle is default
        shape.style.borderRadius = "50%"
      }

      // Common styles
      shape.style.width = `${size}px`
      shape.style.height = `${size}px`
      shape.style.backgroundColor = color
      shape.style.left = `${Math.random() * 100}%`
      shape.style.top = `${Math.random() * 100}%`
      shape.style.opacity = `${0.2 + Math.random() * 0.5}`
      shape.style.animationDelay = `${Math.random() * 5}s`
      shape.style.animationDuration = `${(15 + Math.random() * 15) * speedMultiplier}s`
      shape.style.zIndex = "0"

      // 회전 애니메이션 적용
      const rotationAmount = Math.random() * 360
      shape.style.transform = `rotate(${rotationAmount}deg)`
      shape.style.animationName = "float, rotate"
      shape.style.animationTimingFunction = "ease-in-out, linear"
      shape.style.animationIterationCount = "infinite, infinite"
      shape.style.animationDuration = `${(15 + Math.random() * 15) * speedMultiplier}s, ${20 + Math.random() * 20}s`

      container.appendChild(shape)
      shapesArray.push(shape)
    }

    return () => {
      shapesArray.forEach((shape) => shape.remove())
    }
  }, [count, shapes, speed])

  return (
      <div
          ref={containerRef}
          className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
          aria-hidden="true"
      >
          <style>{`
        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      </div>
  );
}
