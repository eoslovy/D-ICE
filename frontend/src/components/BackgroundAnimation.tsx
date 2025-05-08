import { useEffect, useRef } from "react"

interface BackgroundAnimationProps {
  count?: number;
  shapes?: ("circle" | "square" | "triangle")[];
  speed?: "slow" | "normal" | "fast";
}

export default function BackgroundAnimation({
  count = 15,
  shapes = ["circle", "square", "triangle"],
  speed = "normal",
}: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const shapesArray: HTMLDivElement[] = [];
    const colors = ["#42CAFD", "#EBEBD3", "#FFA69E", "#2A9D8F", "#E84545"]

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
        shape.style.transform = `rotate(${Math.random() * 45}deg)`
      } else if (shapeType === "triangle") {
        shape.style.width = "0"
        shape.style.height = "0"
        shape.style.backgroundColor = "transparent"
        shape.style.borderLeft = `${size / 2}px solid transparent`
        shape.style.borderRight = `${size / 2}px solid transparent`
        shape.style.borderBottom = `${size}px solid ${color}`
      } else {
        // Circle is default
        shape.style.borderRadius = "50%"
        shape.style.backgroundColor = color
      }

      // Common styles
      if (shapeType !== "triangle") {
        shape.style.width = `${size}px`
        shape.style.height = `${size}px`
        shape.style.backgroundColor = color
      }

      shape.style.left = `${Math.random() * 100}%`
      shape.style.top = `${Math.random() * 100}%`
      shape.style.opacity = `${0.2 + Math.random() * 0.5}`
      shape.style.animationDelay = `${Math.random() * 5}s`
      shape.style.animationDuration = `${(15 + Math.random() * 15) * speedMultiplier}s`

      // 회전 애니메이션 적용
      const rotationAmount = Math.random() * 360
      shape.style.transform = `${shape.style.transform || ""} rotate(${rotationAmount}deg)`
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
  )
}
