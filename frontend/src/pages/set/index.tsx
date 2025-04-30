import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../assets/api";
import { WebSocketService } from "../../assets/websocket";

export default function Set() {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState(3);

  const createRoom = async () => {
    try {
        const data = await API.createRoom();
        console.log("방 생성 성공:", data);

        const { roomCode, administratorId } = data;

        // WebSocket 연결 및 관리자 입장
        WebSocketService.connectToAdmin(roomCode, administratorId);

        // 방 코드 저장 및 페이지 이동
        localStorage.setItem("roomcode", roomCode);
        localStorage.setItem("rounds", String(rounds));
        navigate(`/${roomCode}`);
    } catch (error) {
        console.error("방 생성 중 오류:", error);
    }
};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">게임 방 설정</h1>
      <div className="mb-4">
        <label className="block mb-2">라운드 수 (더미):</label>
        <select
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
          className="p-2 rounded bg-gray-700 text-white"
        >
          {Array.from({ length: 8 }, (_, i) => i + 3).map((round) => (
            <option key={round} value={round}>
              {round}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={createRoom}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        방 생성
      </button>
    </div>
  );
}
