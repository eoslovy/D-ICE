import { useEffect, useRef } from "react";

interface ConfettiEffectProps {
    isActive: boolean;
    duration?: number;
    onComplete?: () => void;
    continuous?: boolean;
}

export default function ConfettiEffect({
    isActive,
    duration = 5000,
    onComplete,
    continuous = false,
}: ConfettiEffectProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const confettiPieces = useRef<any[]>([]);
    const colors = [
        "#42CAFD",
        "#EBEBD3",
        "#FFA69E",
        "#2A9D8F",
        "#E84545",
        "#FFD700",
        "#FF9900",
    ];

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const createConfetti = () => {
            const count = 120;
            confettiPieces.current = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 12 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 3 + 2,
                angle: Math.random() * 2 * Math.PI,
                rotation: Math.random() * 0.2 - 0.1,
                shape: Math.random() > 0.5 ? "circle" : "rect",
                opacity: 1,
                fadeOut: false,
            }));
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let hasActive = false;
            for (const piece of confettiPieces.current) {
                if (piece.y > canvas.height) {
                    if (continuous && Math.random() > 0.7) {
                        piece.y = -20 - Math.random() * 50;
                        piece.x = Math.random() * canvas.width;
                        piece.fadeOut = false;
                        piece.opacity = 1;
                    } else {
                        piece.fadeOut = true;
                    }
                }

                if (piece.fadeOut) {
                    piece.opacity -= 0.02;
                    if (piece.opacity < 0) piece.opacity = 0;
                }

                if (piece.opacity <= 0.01) continue;

                piece.y += piece.speed;
                piece.x += Math.sin(piece.angle) * 1.5;
                piece.angle += piece.rotation;

                ctx.save();
                ctx.translate(piece.x, piece.y);
                ctx.rotate(piece.angle);
                ctx.globalAlpha = piece.opacity;
                ctx.fillStyle = piece.color;

                if (piece.shape === "circle") {
                    ctx.beginPath();
                    ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(
                        -piece.size / 2,
                        -piece.size / 2,
                        piece.size,
                        piece.size
                    );
                }

                ctx.restore();

                hasActive = true;
            }

            // 필터로 불필요한 조각 제거
            confettiPieces.current = confettiPieces.current.filter(
                (p) => p.opacity > 0
            );

            if (hasActive) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
                if (onComplete) onComplete();
            }
        };

        createConfetti();
        animate();

        let timeout: number | null = null;
        if (!continuous && duration > 0) {
            timeout = window.setTimeout(() => {
                confettiPieces.current.forEach((piece) => {
                    piece.fadeOut = true;
                });
            }, duration);
        }

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            if (timeout) clearTimeout(timeout);
        };
    }, [isActive, duration, onComplete, continuous]);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: "100%", height: "100%" }}
            aria-hidden="true"
        />
    );
}
