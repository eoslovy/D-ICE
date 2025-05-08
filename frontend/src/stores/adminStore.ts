import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  status: "INGAME" | "WAITING" | null;
  administratorId: string | null;
  roomCode: string | null;
  userCount: number | null; 
  totalRound: number | null; 
  setStatus: (status: "INGAME" | "WAITING") => void; 
  setAdministratorId: (userId: string) => void;
  setRoomCode: (roomCode: string) => void;
  setUserCount: (userCount: number) => void;
  setTotalRound: (totalRound: number) => void;
  reset: () => void; // 초기화 메서드 추가
}

export const adminStore = create<AdminState>()(
  persist(
    (set) => ({
      status: null,
      administratorId: null,
      roomCode: null,
      userCount: null,
      totalRound: null,
      setStatus: (status: "INGAME" | "WAITING") => set({ status }), 
      setAdministratorId: (administratorId: string) => set({ administratorId }),
      setRoomCode: (roomCode: string) => set({ roomCode }),
      setUserCount: (userCount: number) => set({ userCount }),
      setTotalRound: (totalRound: number) => set({ totalRound }),
      reset: () => set({
        status: null,
        administratorId: null,
        roomCode: null,
        userCount: null,
        totalRound: null,
      }) // 초기화 메서드
    }),
    { name: 'adminStore' }
  )
);