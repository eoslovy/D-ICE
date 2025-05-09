import '../globals.css';
import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { userStore } from '../stores/userStore';
import { adminStore } from '../stores/adminStore';
import { useWebSocket } from '../modules/WebSocketContext.tsx';
import adminWebSocketManager from '../modules/AdminWebSocketManager';
import userWebSocketManager from '../modules/UserWebSocketManager.ts';
import { v7 as uuidv7 } from "uuid";
import BackgroundAnimation from '../components/BackgroundAnimation';
import DarkModeToggle from '../components/DarkModeToggle';

export default function WrapperLayout() {
  const navigate = useNavigate();
  const { connectWebSocket } = useWebSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"user" | "admin" | null>(null);
  const [modalRoomCode, setModalRoomCode] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [navigateTo, setNavigateTo] = useState("/");
  const [isReady, setIsReady] = useState(false);
  let requestId = uuidv7();

  const ROUTES = [
    '/tkfkdgody',
    '/dlrjfckwdk',
    '/select',
    '/lobby',
    '/roomSettings',
    /^\/join\/\d{6}$/, // /join/:roomCode 6자리 숫자를 매칭하는 정규식
  ];
  const path = window.location.pathname;
  const isCreatingOrJoiningRoom = ROUTES.some((route) => {
    if (typeof route === 'string') {
      return route === path; // 문자열 비교
    } else if (route instanceof RegExp) {
      return route.test(path); // 정규식 매칭
    }
    return false;
  });
  
  const setModal = (type: "user" | "admin", Code: string) => {
    setModalType(type);
    setModalRoomCode(Code);
    setIsModalOpen(true);
  }
  // 웹소켓 연결 실패 시
  const handleWebSocketError = () => {
    console.error("WebSocket 연결 실패");
    localStorage.removeItem("userStore");
    localStorage.removeItem("adminStore");
    navigate("/select", { replace: true });
  };

  // User WebSocket 연결 및 모달 처리
  const userConnectAndNavigate = (roomCode: string) => {

    const handleUserConnect = () => {
      const USER_WS_URL = `ws://${
        import.meta.env.VITE_API_URL || "localhost:8080"
      }/ws/game/user/${roomCode}`;
      connectWebSocket("user", USER_WS_URL);

      userWebSocketManager.on("reconnect_failed", () => {
        console.error("User WebSocket reconnect failed");
        handleWebSocketError();
      });

      userWebSocketManager.on("connect", () => {
        console.log("User WebSocket 연결 성공");
        handleUserReJoin();
      });
    };

    const handleUserReJoin = () => {
      try {
        userWebSocketManager.sendUserReconnect(requestId, userStore.getState().userId);

        userWebSocketManager.on("USER_RECONNECTED", () => {
          console.log("User Reconnect 성공");
          setHasNavigated(true); // 상태 업데이트
          navigate(navigateTo, { replace: true });
        });

      } catch (error) {
        console.error("User Reconnect 오류:", error);
      } finally{
        requestId = uuidv7();
      }
    }
    

    const handleModalClose = (confirm: boolean) => {
      setIsModalOpen(false);
      if (confirm) {
        handleUserConnect();
      } else {
        RedirectNavigation();
      }
    };

    return { handleModalClose };
  };

  // Admin WebSocket 연결 및 모달 처리
  const adminConnectAndNavigate = (roomCode: string) => {
    setModalType("admin");
    setModalRoomCode(roomCode);
    setIsModalOpen(true);

    const handleAdminConnect = () => {
      const ADMIN_WS_URL = `ws://${
        import.meta.env.VITE_API_URL || "localhost:8080"
      }/ws/game/admin/${roomCode}`;
      connectWebSocket("admin", ADMIN_WS_URL);

      adminWebSocketManager.on("reconnect_failed", () => {
        console.error("Admin WebSocket reconnect failed");
        handleWebSocketError();
      });

      adminWebSocketManager.on("connect", () => {
        console.log("Admin WebSocket 연결 성공");
        handleAdminReJoin();
      });
    };
    const handleAdminReJoin = () => {
      try {
        adminWebSocketManager.sendAdminReconnect(requestId, adminStore.getState().administratorId);

        adminWebSocketManager.on("ADMIN_RECONNECTED", () => {
          console.log("Admin Reconnect 성공");
          setHasNavigated(true); // 상태 업데이트
          navigate(navigateTo, { replace: true });
        });

      } catch (error) {
        console.error("Admin Reconnect 오류:", error);
      } finally{
        requestId = uuidv7();
      }
    }

    const handleModalClose = (confirm: boolean) => {
      setIsModalOpen(false);
      if (confirm) {
        handleAdminConnect();
      } else {
        RedirectNavigation();
      }
    };

    return { handleModalClose };
  };

  

  const applyDarkMode = () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches // 시스템 다크 모드 여부 확인
    if (prefersDarkMode) {
      document.documentElement.classList.add("dark") // html 태그에 dark 클래스 추가하기
    } else {
      document.documentElement.classList.remove("dark") // dark 클래스 제거
    }
  }

  const RedirectNavigation = () => { 
    localStorage.removeItem("userStore");
    localStorage.removeItem("adminStore");
    console.log('path:',path);
    console.log('isCreatingOrJoiningRoom:', isCreatingOrJoiningRoom);
    if (isCreatingOrJoiningRoom || hasNavigated) {
      navigate(path, { replace: true }); // 그대로 현재 경로로 이동
    } else {
      navigate('/select', { replace: true }); // select 페이지로 이동
    }
  }

  useEffect(() => {
    console.log('WrapperLayout useEffect 실행');

    const userStoreData = localStorage.getItem('userStore');
    const adminStoreData = localStorage.getItem('adminStore');

    if (userStoreData && adminStoreData) {
      // 둘 다 존재하면 초기화 후 초기 화면으로 이동
      console.log('Both userStore and adminStore exist. Resetting...');
      userStore.getState().reset();
      adminStore.getState().reset();
      localStorage.removeItem("userStore");
      localStorage.removeItem("adminStore");
      navigate('/select', { replace: true });
      return;
    }

    if (userStoreData) {
      console.log('userStore found.');
      const roomCode = userStore.getState().roomCode;
      const userId = userStore.getState().userId;
      const status = userStore.getState().status;

      if (!roomCode || !userId || status === null) {
        RedirectNavigation();
      } else if (status === 'INGAME') { // "게임중" 이었던 경우
        setNavigateTo(`/game`);
        setModal("user", roomCode);
      } else if (status === 'WAITING') { // "방에서 대기중" 이었던 경우
        setNavigateTo(`/userroom/${roomCode}`)
        setModal("user", roomCode);
      }else{
        console.log('UserStore status is invalid.');
        RedirectNavigation();
      }
    } else if (adminStoreData) {
      console.log('adminStore found.');
      const roomCode = adminStore.getState().roomCode;
      const administratorId = adminStore.getState().administratorId;
      const status = adminStore.getState().status;

      if (!roomCode || !administratorId || status === null || hasNavigated) {
        RedirectNavigation();
      } else if (status === "INGAME") { // "게임중" 이었던 경우
        setNavigateTo(`/broadcast/${roomCode}`);
        setModal("admin", roomCode);
      } else if (status === "WAITING") { // "방에서 대기중" 이었던 경우
        setNavigateTo(`/adminroom/${roomCode}`);
        setModal("admin", roomCode);
      }else{
        console.log('AdminStore status is invalid.');
        RedirectNavigation();
      }
    } else {
      console.log('No userStore or adminStore found');
      RedirectNavigation();
    }
    
    applyDarkMode();

    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    darkModeMediaQuery.addEventListener("change", applyDarkMode)


    setIsReady(true);

    return () => {
      darkModeMediaQuery.removeEventListener("change", applyDarkMode)
    }

  }, []);

  return (
    <div id='app' className="min-h-screen">
      <BackgroundAnimation />
      <DarkModeToggle />
      {(isReady && !isModalOpen) && <Outlet />}
      {/* 모달 창 */}
      {isModalOpen && (
        <div className="modal flex items-center justify-center min-h-screen">
          <div className="modal-content p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              {modalType === "user" ? "유저 접속 확인" : "관리자 접속 확인"}
            </h2>
            <p className="text-lg mb-6">
              {modalType === "user"
                ? `유저로 방(${modalRoomCode})에 접속하시겠습니까?`
                : `관리자로 방(${modalRoomCode})에 접속하시겠습니까?`}
            </p>
            <div className="modal-actions flex justify-center gap-4 mt-4">
              <button
                className="btn btn-primary px-6 py-2 text-lg"
                onClick={() => {
                  if (modalType === "user") {
                    userConnectAndNavigate(modalRoomCode!).handleModalClose(true);
                  } else if (modalType === "admin") {
                    adminConnectAndNavigate(modalRoomCode!).handleModalClose(true);
                  }
                }}
              >
                예
              </button>
              <button
                className="btn btn-secondary px-6 py-2 text-lg"
                onClick={() => {
                  if (modalType === "user") {
                    userConnectAndNavigate(modalRoomCode!).handleModalClose(false);
                  } else if (modalType === "admin") {
                    adminConnectAndNavigate(modalRoomCode!).handleModalClose(false);
                  }
                }}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}