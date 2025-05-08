import { create } from 'zustand';

interface UserState {
  userId: string;
  roomCode: string;
  setUserId: (userId: string) => void;
  setRoomCode: (roomCode: string) => void;
}

export const userStore = create<UserState>((set) => ({
  userId: '',
  roomCode: '',
  setUserId: (userId: string) => set({ userId }),
  setRoomCode: (roomCode: string) => set({ roomCode }),
})); 