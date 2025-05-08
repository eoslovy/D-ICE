import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  status : string | null;
  userId: string;
  roomCode: string;
  nickname: string;
  setStatus: (status: "INGAME" | "WAITING") => void; 
  setUserId: (userId: string) => void;
  setRoomCode: (roomCode: string) => void;
  setNickname: (nickname: string) => void;
  reset: () => void; // 초기화 메서드 추가
}

export const userStore = create<UserState>()(
  persist(
    (set) => ({
    status : null,
    userId: "",
    roomCode: "",
    nickname: "",
    setStatus: (status: "INGAME" | "WAITING") => set({ status }), 
    setUserId: (userId: string) => set({ userId }),
    setRoomCode: (roomCode: string) => set({ roomCode }),
    setNickname: (nickname: string) => set({ nickname }),
    reset: () => set({
      status: null,
      userId: "",
      roomCode: "",
      nickname: "", 
    }) // 초기화 메서드
   }),
   { name: 'userStore' }
  )

);