import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// QR 코드로 입장 시 로비로 리다이렉트 해주는 페이지
export default function Join() {
  const { roomCode } = useParams(); // URL에서 roomCode 추출
  const navigate = useNavigate();

  useEffect(() => {
    if (roomCode) {
      // roomCode를 로컬 스토리지에 저장
      localStorage.setItem("roomCode", roomCode);
      console.log(`roomCode ${roomCode} 저장 완료`);
    }else{
        console.log("roomCode가 없습니다.");
    }
    // /lobby로 리다이렉트
    navigate("/lobby", { replace: true });

  }, [roomCode, navigate]);

  return <div>Redirecting...</div>;
}