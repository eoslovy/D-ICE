import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  status: "INGAME" | "WAITING" | null;
  administratorId: string;
  roomCode: string;
  userCount: number; 
  totalRound: number;
  currentRound: number;      // 현재 라운드
  gameType: string;          // 진행중인 게임 이름
  setStatus: (status: "INGAME" | "WAITING") => void; 
  setAdministratorId: (userId: string) => void;
  setRoomCode: (roomCode: string) => void;
  setUserCount: (userCount: number) => void;
  setTotalRound: (totalRound: number) => void;
  setCurrentRound: (currentRound: number) => void;
  setGameType: (gameType: string) => void;
  reset: () => void;
}

export const adminStore = create<AdminState>()(
  persist(
    (set) => ({
      status: null,
      administratorId: "",
      roomCode: "",
      userCount: 0,
      totalRound: 1,
      currentRound: 1,
      gameType: "",
      setStatus: (status: "INGAME" | "WAITING") => set({ status }), 
      setAdministratorId: (administratorId: string) => set({ administratorId }),
      setRoomCode: (roomCode: string) => set({ roomCode }),
      setUserCount: (userCount: number) => set({ userCount }),
      setTotalRound: (totalRound: number) => set({ totalRound }),
      setCurrentRound: (currentRound: number) => set({ currentRound }),
      setGameType: (gameType: string) => set({ gameType }),
      reset: () => set({
        status: null,
        administratorId: "",
        roomCode: "",
        userCount: 0,
        totalRound: 1,
        currentRound: 1,
        gameType: "",
      }) // 초기화 메서드
    }),
    { name: 'adminStore' }
  )
);