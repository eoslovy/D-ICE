import { useEffect, useState } from "react";
import { PlayCircle, PauseCircle } from "lucide-react";
import { getAudioInstance, stopAudio } from "../modules/AudioPlayer";

export default function BackgroundMusicToggle() {
    const [isMusic, setIsMusic] = useState(true);
    const [blocked, setBlocked] = useState(false); // INGAME 상태 여부

    const detectColorScheme = () => {
        const saved = localStorage.getItem("isDarkMode");
        if (saved === "true") return "dark";
        if (saved === "false") return "light";

        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;
        const mode = prefersDark ? "dark" : "light";
        localStorage.setItem("isDarkMode", prefersDark ? "true" : "false");
        return mode;
    };

    const playMusic = (mode: "light" | "dark") => {
        const src = `/assets/bgm/${mode}.mp3`;
        const audio = getAudioInstance(src);
        if (isMusic && !blocked) {
            audio.play();
        }
    };

    // adminStore 상태 감지
    useEffect(() => {
        const checkAdminStatus = () => {
            try {
                const admin = JSON.parse(
                    localStorage.getItem("adminStore") || "{}"
                );
                const isBlocked = admin.status === "INGAME";
                setBlocked(isBlocked);
                if (isBlocked) {
                    stopAudio();
                } else if (isMusic) {
                    const mode = detectColorScheme();
                    playMusic(mode);
                }
            } catch (err) {
                console.error("adminStore 파싱 오류:", err);
            }
        };

        checkAdminStatus();
        const interval = setInterval(checkAdminStatus, 1000);
        return () => clearInterval(interval);
    }, [isMusic]);

    // 테마 변경 감지
    useEffect(() => {
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = (e: MediaQueryListEvent) => {
            const newMode = e.matches ? "dark" : "light";
            localStorage.setItem(
                "isDarkMode",
                newMode === "dark" ? "true" : "false"
            );

            if (isMusic && !blocked) {
                playMusic(newMode);
            }
        };

        mql.addEventListener("change", listener);
        return () => mql.removeEventListener("change", listener);
    }, [isMusic, blocked]);

    // 음악 on/off 상태에 따라 재생 또는 정지
    useEffect(() => {
        const audio = getAudioInstance(
            `/assets/bgm/${detectColorScheme()}.mp3`
        );
        if (isMusic && !blocked) {
            audio.play();
        } else {
            audio.pause();
        }
    }, [isMusic, blocked]);

    const toggleMusic = () => {
        setIsMusic((prev) => !prev);
    };

    return (
        <button
            onClick={toggleMusic}
            disabled={blocked}
            className={`fixed top-16 right-4 z-50 p-2 rounded-full shadow-md transition-colors ${
                blocked
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            aria-label={isMusic ? "Pause music" : "Play music"}
        >
            {isMusic ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
        </button>
    );
}
