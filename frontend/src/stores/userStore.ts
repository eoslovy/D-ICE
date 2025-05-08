import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  status : string | null;
  userId: string | null;
  roomCode: string | null;
  nickname: string | null;
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
    userId: null,
    roomCode: null,
    nickname: null,
    setStatus: (status: "INGAME" | "WAITING") => set({ status }), 
    setUserId: (userId: string) => set({ userId }),
    setRoomCode: (roomCode: string) => set({ roomCode }),
    setNickname: (nickname: string) => set({ nickname }),
    reset: () => set({
      status: null,
      userId: null,
      roomCode: null,
      nickname: null, 
    }) // 초기화 메서드
   }),
   { name: 'userStore' }
  )

);