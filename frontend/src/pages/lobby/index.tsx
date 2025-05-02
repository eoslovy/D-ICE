import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WebSocketUser } from "../../assets/websocket";

export default function Lobby() {
    const [roomCodeInput, setroomCodeInput] = useState("");
    const [nicknameInput, setnicknameInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nicknameInput) {
            setErrorMessage("닉네임을 입력하세요.");
            return;
        }

        if (!roomCodeInput) {
            setErrorMessage("방 번호를 입력하세요.");
            return;
        }

        try {
            // WebSocket을 통해 방에 입장 (Promise를 반환하므로 await 사용)
            const result = await WebSocketUser.joinRoom(roomCodeInput, nicknameInput);

            if (result.success) {
                // 성공적으로 방에 입장했을 때만 페이지 이동
                navigate(`/${roomCodeInput}`);
            } else {
                // 서버에서 성공은 했지만 문제가 있는 경우 (드문 케이스)
                setErrorMessage(result.message || "알 수 없는 오류가 발생했습니다.");
            }
        } catch (error: any) {
            // 서버 연결 실패, 유효하지 않은 방 코드 등의 오류 처리
            console.error("방 입장 중 오류:", error);
            setErrorMessage("방 입장에 실패했습니다. 다시 시도해주세요.");
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">게임 로비</h1>
            <h3 className="text-lg mb-6">게임에 입장하세요!</h3>

            <form onSubmit={handleSubmit} className="mb-6">
                <input
                    id="nickname"
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => {
                        setnicknameInput(e.target.value);
                        setErrorMessage("");
                    }}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="닉네임을 입력하세요"
                />

                <div className="flex items-center">
                    <input
                        id="roomCode"
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => {
                            setroomCodeInput(e.target.value);
                            setErrorMessage("");
                        }}
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="방 번호를 입력하세요"
                    />
                    <button
                        type="submit"
                        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2"
                    >
                        입장
                    </button>
                </div>
            </form>

            {/* 에러 메시지 출력 */}
            {errorMessage && (
                <p className="text-red-600 font-semibold">{errorMessage}</p>
            )}
        </div>
    );
}
