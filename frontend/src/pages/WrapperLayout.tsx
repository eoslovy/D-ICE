import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { userStore } from '../stores/userStore';
import { adminStore } from '../stores/adminStore';
import { useWebSocket } from '../modules/WebSocketContext.tsx';
import adminWebSocketManager from '../modules/AdminWebSocketManager';
import userWebSocketManager from '../modules/UserWebSocketManager.ts';

export default function WrapperLayout() {
  const navigate = useNavigate();
  const { connectWebSocket } = useWebSocket();

  // Admin WebSocket 연결 및 이동 함수
  const connectAdminAndNavigate = (roomCode: string, navigateTo: string) => {
    const ADMIN_WS_URL = `ws://${
      import.meta.env.VITE_API_URL || "localhost:8080"
    }/ws/game/admin/${roomCode}`;
    connectWebSocket("admin", ADMIN_WS_URL);

    adminWebSocketManager.on("connect", () => {
      console.log("Admin WebSocket 연결 성공");
      navigate(navigateTo, { replace: true });
    });
  };

  // User WebSocket 연결 함수
  const userConnectAndNavigate = (roomCode: string, navigateTo: string) => {
    const USER_WS_URL = `ws://${
      import.meta.env.VITE_API_URL || "localhost:8080"
    }/ws/game/user/${roomCode}`;
    connectWebSocket("user", USER_WS_URL);

    userWebSocketManager.on("connect", () => {
      console.log("User WebSocket 연결 성공");
      navigate(navigateTo, { replace: true });
    });
  };

  useEffect(() => {
    const userStoreData = localStorage.getItem('userStore');
    const adminStoreData = localStorage.getItem('adminStore');

    if (userStoreData && adminStoreData) {
      // 둘 다 존재하면 초기화 후 초기 화면으로 이동
      console.log('Both userStore and adminStore exist. Resetting...');
      userStore.getState().reset();
      adminStore.getState().reset();
      localStorage.clear();
      navigate('/select', { replace: true });
      return;
    }

    if (userStoreData) {
      console.log('User identified as a regular user.');
      const roomCode = userStore.getState().roomCode;
      const status = userStore.getState().status;

      if (!roomCode) {
        navigate('/select', { replace: true });
      } else if (status === 'INGAME') {
        userConnectAndNavigate(roomCode,`/game`);
        navigate(`/game`, { replace: true }); // 게임 중인 경우
      } else if (status === 'WAITING') {
        userConnectAndNavigate(roomCode, `/userroom/${roomCode}`);
        navigate(`/userroom/${roomCode}`, { replace: true }); // 방에서 대기 중인 경우
      }
    } else if (adminStoreData) {
      console.log('User identified as an admin.');
      const roomCode = adminStore.getState().roomCode;
      const status = adminStore.getState().status;

      if (!roomCode) {
        navigate('/select', { replace: true });
      } else if (status === "INGAME") {
        connectAdminAndNavigate(roomCode,`/broadcast/${roomCode}`);
        navigate(`/broadcast/${roomCode}`, { replace: true }); // 게임 중인 경우
      } else if (status === "WAITING") {
        connectAdminAndNavigate(roomCode, `/adminroom/${roomCode}`);
      }
    } else {
      console.log('No userStore or adminStore found. Redirecting to select screen.');
      navigate('/select', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="p-8 w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center">
      <Outlet />
    </div>
  );
}