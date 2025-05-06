import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function WrapperLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const ROUTES = ['/select', '/lobby', '/roomSettings'];
    const path = window.location.pathname;
    const isCreatingOrJoiningRoom = ROUTES.includes(path);
    const roomCode = localStorage.getItem('roomCode') || "000000";
    const user = localStorage.getItem('nickname');
    const admin = localStorage.getItem('administratorId');

    const isUser = user !== null;
    const isAdmin = admin !== null;
    
    // URL에서 현재 방 코드 추출 (예: /123456/admin -> 123456)
    const currentRoomCode = path.split('/')[1];
    
    // 1. 방 생성/입장 페이지가 아니고, 방 코드가 없거나 기본값인 경우 -> 선택 페이지로
    if (!isCreatingOrJoiningRoom && (roomCode === null || roomCode === "000000")) {
      navigate('/select', { replace: true });
      return; // 더 이상 처리하지 않음
    }
    
    // 2. URL의 방 코드와 localStorage의 방 코드가 다른 경우 -> 선택 페이지로
    if (currentRoomCode && roomCode !== "000000" && roomCode !== currentRoomCode) {
      navigate('/select', { replace: true });
      return; // 더 이상 처리하지 않음
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
    
    // 4. 방 코드가 기본값이고 생성/입장 페이지에 있으며, 사용자 정보가 없는 경우 (QR 접속)
    if (
      roomCode === "000000" &&
      isCreatingOrJoiningRoom &&
      !isUser &&
      !isAdmin &&
      path !== "/select" // select 페이지에서는 lobby로 이동하지 않음
    ) {
      navigate('/lobby', { replace: true });
      return;
    }
    
  }, [navigate]);

  return (
    <div className="">
      <Outlet />
    </div>
  );
}