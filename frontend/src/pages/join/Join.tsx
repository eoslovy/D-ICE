import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// QR 코드로 입장 시 로비로 리다이렉트 해주는 페이지
export default function Join() {
  const { roomCode: urlRoomCode } = useParams(); // URL에서 roomCode 추출
  const navigate = useNavigate();

  useEffect(() => {
    if (!urlRoomCode){
      console.log("urlRoomCode가 없습니다")
      return;
    }
    // urlRoomCode 가 6자리 숫자인지 확인
    const isValidRoomCode = /^\d{6}$/.test(urlRoomCode);
    if (!isValidRoomCode) {
      console.log("urlRoomCode가 유효하지 않습니다:", urlRoomCode);
      return;
    }
    console.log('Join useEffect 실행');

    // urlRoomCode 를 로컬 스토리지에 저장
    sessionStorage.setItem("urlRoomCode", urlRoomCode);
    console.log(`urlRoomCode ${urlRoomCode} 저장 완료`);

    // /lobby로 리다이렉트
    navigate("/lobby", { replace: true });

  }, [urlRoomCode, navigate]);

  return <div>Redirecting...</div>;
}