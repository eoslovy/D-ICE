import type { ReactNode } from "react"

interface GameCardProps {
  children: ReactNode
  className?: string
}

export default function GameCard({ children, className = "" }: GameCardProps) {
  return <div className={`game-card ${className}`}>{children}</div>
}
