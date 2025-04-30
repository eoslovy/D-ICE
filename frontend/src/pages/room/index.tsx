import GenerateQrCode from "../../components/QRcode";
import { WebSocketService } from "../../assets/websocket";

export default function Room() {
  const startGame = async () => {
      try{
        WebSocketService.startGame();
      }
      catch (error) {
      console.error("게임 시작 중 오류:", error);
    }
  }

  const isAdmin = localStorage.getItem("administratorId") != null;
  const roomCode = localStorage.getItem("roomcode") || "000000";


  return (
    <div>
      <h1>시작 대기중...</h1>
      {isAdmin && (
        <button
          onClick={startGame}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          게임 시작
        </button>
      )}
      {/* <GenerateQrCode roomcode=roomCode /> */}
    </div>
  );
}   