"use client"

import { useEffect, useRef } from "react"

interface BackgroundAnimationProps {
  count?: number
}

export default function BackgroundAnimation({ count = 15 }: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current;
    const shapes: HTMLDivElement[] = [];
    const colors = ["#42CAFD", "#EBEBD3", "#FFA69E", "#2A9D8F", "#E84545"];

    // Clear any existing shapes
    container.innerHTML = "";

    // Create new shapes
    for (let i = 0; i < count; i++) {
      const shape = document.createElement("div");
      const size = Math.random() * 80 + 20;
      const color = colors[Math.floor(Math.random() * colors.length)];

      shape.className = "floating-shape";
      shape.style.width = `${size}px`;
      shape.style.height = `${size}px`;
      shape.style.backgroundColor = color;
      shape.style.left = `${Math.random() * 100}%`;
      shape.style.top = `${Math.random() * 100}%`;
      shape.style.animationDelay = `${Math.random() * 5}s`;
      shape.style.animationDuration = `${15 + Math.random() * 15}s`;

      container.appendChild(shape);
      shapes.push(shape);
    }

    return () => {
      shapes.forEach((shape) => shape.remove());
    }
  }, [count])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
