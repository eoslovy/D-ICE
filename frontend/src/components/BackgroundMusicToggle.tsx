import { useEffect, useState, useRef, useCallback } from "react";
import { PlayCircle, PauseCircle } from "lucide-react";
import { getAudioInstance } from "../modules/AudioPlayer";

export default function BackgroundMusicToggle() {
    const [isPlaying, setIsPlaying] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [isGamePage, setIsGamePage] = useState(false);
    const [themeMode, setThemeMode] = useState(() =>
        localStorage.getItem("isDarkMode") === "true" ? "dark" : "light"
    );
    const [isFinalState, setIsFinalState] = useState(
        () => sessionStorage.getItem("isFinal") === "true"
    );
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Check if we're on the game page
    const checkGamePage = useCallback(() => {
        const isOnGamePage = window.location.pathname.endsWith("/game");
        setIsGamePage(isOnGamePage);
        return isOnGamePage;
    }, []);

    // Get audio source based on current mode and game state
    const getAudioSrc = useCallback(() => {
        return isFinalState
            ? "/assets/bgm/final.mp3"
            : `/assets/bgm/${themeMode}.mp3`;
    }, [themeMode, isFinalState]);

    // 다크모드와 파이널 상태 감지
    useEffect(() => {
        // 테마 변경 감지 함수
        const checkThemeAndFinalState = () => {
            const newThemeMode =
                localStorage.getItem("isDarkMode") === "true"
                    ? "dark"
                    : "light";
            const newFinalState = sessionStorage.getItem("isFinal") === "true";

            if (newThemeMode !== themeMode) {
                setThemeMode(newThemeMode);
            }

            if (newFinalState !== isFinalState) {
                setIsFinalState(newFinalState);
            }
        };

        // 로컬 스토리지 변경 이벤트 리스너
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "isDarkMode" || e.key === "isFinal") {
                checkThemeAndFinalState();
            }
        };

        // 이벤트 리스너 등록
        window.addEventListener("storage", handleStorageChange);

        // 같은 창에서의 변경도 감지하기 위한 인터벌 설정
        const themeCheckInterval = setInterval(checkThemeAndFinalState, 1000);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(themeCheckInterval);
        };
    }, [themeMode, isFinalState]);

    // Initialize audio on first render
    useEffect(() => {
        // Initialize audio only once
        if (!audioRef.current) {
            audioRef.current = getAudioInstance(getAudioSrc());

            // Set up ended event handler
            if (audioRef.current) {
                audioRef.current.onended = () => {
                    if (isPlaying && !isGamePage && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current
                            .play()
                            .catch((err) =>
                                console.warn("🎵 Playback failed:", err)
                            );
                    }
                };
            }

            setIsReady(true);
        }

        return () => {
            // Clean up audio on component unmount
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.onended = null;
            }
        };
    }, [getAudioSrc, isPlaying, isGamePage]);

    // Check game page status periodically
    useEffect(() => {
        // Check initially
        checkGamePage();

        // Set up interval for checking
        const interval = setInterval(() => {
            const isOnGamePage = checkGamePage();

            // If we're on the game page, stop audio
            if (isOnGamePage && audioRef.current) {
                audioRef.current.pause();
            } else if (isPlaying && audioRef.current && isReady) {
                // Resume playback when leaving game page
                audioRef.current
                    .play()
                    .catch((err) => console.warn("🎵 Playback failed:", err));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [checkGamePage, isPlaying, isReady]);

    // Handle theme or final stage changes
    useEffect(() => {
        if (!audioRef.current || !isReady) return;

        const currentSrc = getAudioSrc();
        if (!audioRef.current.src.includes(currentSrc)) {
            // Update source if it changed
            audioRef.current.src = currentSrc;

            // Restart playback if it was playing
            if (isPlaying && !isGamePage) {
                audioRef.current
                    .play()
                    .catch((err) =>
                        console.warn(
                            "🎵 Playback failed after source change:",
                            err
                        )
                    );
            }
        }
    }, [getAudioSrc, isPlaying, isGamePage, isReady]);

    // Handle play/pause state changes
    useEffect(() => {
        if (!audioRef.current || !isReady) return;

        if (isPlaying && !isGamePage) {
            audioRef.current.play().catch((err) => {
                console.warn("🎵 Playback failed:", err);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, isGamePage, isReady]);

    // Toggle music function
    const toggleMusic = useCallback(() => {
        setIsPlaying((prev) => !prev);
    }, []);

    return (
        <button
            onClick={toggleMusic}
            disabled={isGamePage}
            className={`fixed top-16 right-4 z-50 p-2 rounded-full shadow-md transition-colors ${
                isGamePage
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            aria-label={isPlaying ? "Pause music" : "Play music"}
        >
            {isPlaying ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
        </button>
    );
}
