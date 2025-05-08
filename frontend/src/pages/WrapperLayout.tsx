"use client";

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


  // 웹소켓 연결 실패 시
  const handleWebSocketError = () => {
    console.error("WebSocket 연결 실패");
    localStorage.clear(); // localStorage 초기화
    navigate("/select", { replace: true });
  };

  // Admin WebSocket 연결 및 이동 함수
  const connectAdminAndNavigate = (roomCode: string, navigateTo: string) => {
    const ADMIN_WS_URL = `ws://${
      import.meta.env.VITE_API_URL || "localhost:8080"
    }/ws/game/admin/${roomCode}`;
    connectWebSocket("admin", ADMIN_WS_URL);

    adminWebSocketManager.on("reconnect_failed", () => {
      handleWebSocketError();
    });
      
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

    userWebSocketManager.on("reconnect_failed", () => {
      handleWebSocketError();
    });

    userWebSocketManager.on("connect", () => {
      console.log("User WebSocket 연결 성공");
      navigate(navigateTo, { replace: true });
    });
  };

  const applyDarkMode = () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches // 시스템 다크 모드 여부 확인
    if (prefersDarkMode) {
      document.documentElement.classList.add("dark") // html 태그에 dark 클래스 추가하기
    } else {
      document.documentElement.classList.remove("dark") // dark 클래스 제거
    }
  }

  useEffect(() => {
    const userStoreData = localStorage.getItem('userStore');
    const adminStoreData = localStorage.getItem('adminStore');
    const isQRCode = localStorage.getItem("isQRCode") === "true";

    if (isQRCode) {
        localStorage.removeItem("isQRCode");
        navigate('/lobby', { replace: true });
        return; // 더 이상 처리하지 않음
    }

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

    const applyDarkMode = () => {
      const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches // 시스템 다크 모드 여부 확인
      if (prefersDarkMode) {
        document.documentElement.classList.add("dark") // html 태그에 dark 클래스 추가하기
      } else {
        document.documentElement.classList.remove("dark") // dark 클래스 제거
      }
    }
    
    applyDarkMode();

    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    darkModeMediaQuery.addEventListener("change", applyDarkMode)

    // const ROUTES = ['/select', '/lobby', '/roomSettings'];
    // const path = window.location.pathname;
    // const isCreatingOrJoiningRoom = ROUTES.includes(path);
    // const roomCode = localStorage.getItem('roomCode') || "000000";
    // const user = localStorage.getItem('nickname');
    // const admin = localStorage.getItem('administratorId');

    // const isUser = user !== null || user !== undefined;
    // const isAdmin = admin !== null || admin !== undefined;
    
    // const currentRoomCode = (() => {
    //   const segments = path.split('/').filter(Boolean); // 빈 문자열 제거
    //   if (segments.length >= 2) {
    //     return segments[1]; // 두 번째 세그먼트가 방 코드
    //   }
    //   return null; // 방 코드가 없으면 null 반환
    // })();
    
    // // 1. 방 생성/입장 페이지가 아니고, 방 코드가 없거나 기본값인 경우 -> 선택 페이지로
    // if (!isCreatingOrJoiningRoom && (roomCode === null || roomCode === "000000")) {
    //   navigate('/select', { replace: true });
    // }
    
    // // 2. URL의 방 코드와 localStorage의 방 코드가 다른 경우 -> 선택 페이지로
    // if (!isCreatingOrJoiningRoom && currentRoomCode && roomCode !== "000000" && roomCode !== currentRoomCode) {
    //   navigate('/select', { replace: true });
    //   return; // 더 이상 처리하지 않음
    // }

    // if (roomCode !== "000000" && isAdmin) {
    //   navigate(`/adminroom/${roomCode}`, { replace: true });
    //   return; // 더 이상 처리하지 않음
    // }

    // if (roomCode !== "000000" && isUser) {
    //   navigate(`/userroom/${roomCode}`, { replace: true });
    //   return; // 더 이상 처리하지 않음
    // }

    
    // // 3. 방 코드가 기본값이 아니고 생성/입장 페이지에 있는 경우 처리
    // if (roomCode !== "000000" && isCreatingOrJoiningRoom) {
    //   // 사용자인 경우 게임룸으로
    //   if (isUser) {
    //     navigate(`/${roomCode}`, { replace: true });
    //     return;
    //   }
    //   // 관리자인 경우 관리자 페이지로
    //   else if (isAdmin) {
    //     navigate(`/${roomCode}/admin`, { replace: true });
    //     return;
    //   }
    // }
    
    // // 4. 방 코드가 기본값이고 생성/입장 페이지에 있는 경우
    // if (
    //   roomCode === "000000" &&
    //   isCreatingOrJoiningRoom &&
    //   !isUser &&
    //   !isAdmin &&
    //   path !== "/select" &&
    //   path !== "/roomSettings" // select, roomSettings 페이지에서는 lobby로 이동하지 않음
    // ) {
    //   navigate('/lobby', { replace: true });
    //   return;
    // }

    return () => {
      darkModeMediaQuery.removeEventListener("change", applyDarkMode)
    }

  }, [navigate]);

  return (
    <div id='app' className="min-h-screen">
      <Outlet />
    </div>
  );
}