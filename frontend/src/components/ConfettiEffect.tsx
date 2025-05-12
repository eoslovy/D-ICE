import { useEffect, useRef } from "react"

interface ConfettiEffectProps {
  isActive: boolean
  duration?: number
  onComplete?: () => void
}

export default function ConfettiEffect({ isActive, duration = 3000, onComplete }: ConfettiEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const confettiPieces = useRef<any[]>([])
  const colors = ["#42CAFD", "#EBEBD3", "#FFA69E", "#2A9D8F", "#E84545"]

  useEffect(() => {
    if (!isActive || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create confetti pieces
    const createConfetti = () => {
      confettiPieces.current = []
      for (let i = 0; i < 200; i++) {
        confettiPieces.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          size: Math.random() * 10 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          speed: Math.random() * 3 + 2,
          angle: Math.random() * 2 * Math.PI,
          rotation: Math.random() * 0.2 - 0.1,
          shape: Math.random() > 0.5 ? "circle" : "rect",
        })
      }
    }

    // Animate confetti
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let stillActive = false

      confettiPieces.current.forEach((piece) => {
        piece.y += piece.speed
        piece.x += Math.sin(piece.angle) * 2
        piece.angle += piece.rotation

        if (piece.y < canvas.height) {
          stillActive = true
        }

        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.angle)
        ctx.fillStyle = piece.color

        if (piece.shape === "circle") {
          ctx.beginPath()
          ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size)
        }

        ctx.restore()
      })

      if (stillActive) {
        animationRef.current = requestAnimationFrame(animate)
      } else if (onComplete) {
        onComplete()
      }
    }

    createConfetti()
    animate()

    // Set timeout to stop animation after duration
    const timeout = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      if (onComplete) onComplete()
    }, duration)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      clearTimeout(timeout)
    }
  }, [isActive, duration, onComplete])

  if (!isActive) return null

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" aria-hidden="true" />
}
