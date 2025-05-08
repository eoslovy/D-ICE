import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// QR 코드로 입장 시 로비로 리다이렉트 해주는 페이지
export default function Join() {
  const { roomCode } = useParams(); // URL에서 roomCode 추출
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomCode){
      console.log("roomCode가 없습니다")
      return;
    }
    // roomCode가 6자리 숫자인지 확인
    const isValidRoomCode = /^\d{6}$/.test(roomCode);
    if (!isValidRoomCode) {
      console.log("roomCode가 유효하지 않습니다:", roomCode);
      return;
    }
    console.log('Join useEffect 실행');

    // roomCode를 로컬 스토리지에 저장
    localStorage.setItem("roomCode", roomCode);
    console.log(`roomCode ${roomCode} 저장 완료`);

    // /lobby로 리다이렉트
    navigate("/lobby", { replace: true });

  }, [roomCode, navigate]);

  return <div>Redirecting...</div>;
}