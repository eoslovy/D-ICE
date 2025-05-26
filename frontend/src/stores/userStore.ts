import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
    status: string | null;
    userId: string;
    roomCode: string;
    nickname: string;
    gameType: string; // 진행중인 게임 이름
    startAt: number; // 게임 시작 시각 (epoch ms)
    duration: number; // 게임 지속시간 (ms)
    currentMs: number; // 현재 시각 (epoch ms, 유저와 시간 align 용)
    timeOffset: number; // 클라이언트 시각과 서버 시각 차이, (Client - Server)
    setStatus: (status: "INGAME" | "WAITING") => void;
    setUserId: (userId: string) => void;
    setRoomCode: (roomCode: string) => void;
    setNickname: (nickname: string) => void;
    setGameType: (gameType: string) => void;
    setStartAt: (startAt: number) => void;
    setDuration: (duration: number) => void;
    setCurrentMs: (currentMs: number) => void;
    setTimeOffset: (timeOffset: number) => void;
    reset: () => void;
}

export const userStore = create<UserState>()(
    persist(
        (set) => ({
            status: null,
            userId: "",
            roomCode: "",
            nickname: "",
            gameType: "",
            startAt: 0,
            duration: 0,
            currentMs: 0,
            timeOffset: 0,
            setStatus: (status: "INGAME" | "WAITING") => set({ status }),
            setUserId: (userId: string) => set({ userId }),
            setRoomCode: (roomCode: string) => set({ roomCode }),
            setNickname: (nickname: string) => set({ nickname }),
            setGameType: (gameType: string) => set({ gameType }),
            setStartAt: (startAt: number) => set({ startAt }),
            setDuration: (duration: number) => set({ duration }),
            setCurrentMs: (currentMs: number) => set({ currentMs }),
            setTimeOffset: (timeOffset: number) => set({ timeOffset }),
            reset: () =>
                set({
                    status: null,
                    userId: "",
                    roomCode: "",
                    nickname: "",
                    gameType: "",
                    startAt: 0,
                    duration: 0,
                    currentMs: 0,
                    timeOffset: 0,
                }),
        }),
        { name: "userStore" }
    )
);