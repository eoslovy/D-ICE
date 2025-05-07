"use client";

import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function WrapperLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    applyDarkMode();

    const ROUTES = ['/select', '/lobby', '/roomSettings'];
    const path = window.location.pathname;
    const isCreatingOrJoiningRoom = ROUTES.includes(path);
    const roomCode = localStorage.getItem('roomCode') || "000000";
    const user = localStorage.getItem('nickname');
    const admin = localStorage.getItem('administratorId');

    const isUser = user !== null || user !== undefined;
    const isAdmin = admin !== null || admin !== undefined;
    
    const currentRoomCode = (() => {
      const segments = path.split('/').filter(Boolean); // 빈 문자열 제거
      if (segments.length >= 2) {
        return segments[1]; // 두 번째 세그먼트가 방 코드
      }
      return null; // 방 코드가 없으면 null 반환
    })();
    
    // 1. 방 생성/입장 페이지가 아니고, 방 코드가 없거나 기본값인 경우 -> 선택 페이지로
    if (!isCreatingOrJoiningRoom && (roomCode === null || roomCode === "000000")) {
      navigate('/select', { replace: true });
    }
    
    // 2. URL의 방 코드와 localStorage의 방 코드가 다른 경우 -> 선택 페이지로
    if (!isCreatingOrJoiningRoom && currentRoomCode && roomCode !== "000000" && roomCode !== currentRoomCode) {
      navigate('/select', { replace: true });
      return; // 더 이상 처리하지 않음
    }

    if (roomCode !== "000000" && isAdmin) {
      navigate(`/adminroom/${roomCode}`, { replace: true });
      return; // 더 이상 처리하지 않음
    }

    if (roomCode !== "000000" && isUser) {
      navigate(`/userroom/${roomCode}`, { replace: true });
      return; // 더 이상 처리하지 않음
    }

    // URL의 방 코드와 LocalStorage의 방 코드가 같고, 방 코드가 기본값이 아닌 경우, isUser가 아닌 경우(QR코드 입장)
    if (roomCode !== "000000" && !isUser) {
      const isQRCode = localStorage.getItem("isQRCode") === "true";
      if (isQRCode) {
        localStorage.removeItem("isQRCode"); // QR코드 입장 후 LocalStorage에서 제거
        navigate('/lobby', { replace: true });
        return; // 더 이상 처리하지 않음
      }
    }
    
    // 3. 방 코드가 기본값이 아니고 생성/입장 페이지에 있는 경우 처리
    if (roomCode !== "000000" && isCreatingOrJoiningRoom) {
      // 사용자인 경우 게임룸으로
      if (isUser) {
        navigate(`/${roomCode}`, { replace: true });
        return;
      }
      // 관리자인 경우 관리자 페이지로
      else if (isAdmin) {
        navigate(`/${roomCode}/admin`, { replace: true });
        return;
      }
    }
    
    // 4. 방 코드가 기본값이고 생성/입장 페이지에 있는 경우
    if (
      roomCode === "000000" &&
      isCreatingOrJoiningRoom &&
      !isUser &&
      !isAdmin &&
      path !== "/select" &&
      path !== "/roomSettings" // select, roomSettings 페이지에서는 lobby로 이동하지 않음
    ) {
      navigate('/lobby', { replace: true });
      return;
    }

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
