import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 실제 서비스에서는 Redis/WebSocket 등을 통한 방 체크
const checkRoomExists = async (code: string): Promise<boolean> => {
    const existingRooms = ["room1", "room2"];
    return existingRooms.includes(code);
};

export default function Lobby() {
    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomCodeInput) {
            setErrorMessage("방 번호를 입력하세요.");
            return;
        }
        if (!(await checkRoomExists(roomCodeInput))) {
            setErrorMessage("해당 방이 존재하지 않습니다.");
            return;
        }
        sessionStorage.setItem("roomcode", roomCodeInput);
        navigate(`/${roomCodeInput}`);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">게임 로비</h1>
            <h3 className="text-lg mb-6">게임에 입장하세요!</h3>

            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex items-center">
                    <input
                        id="roomcode"
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => {
                            setRoomCodeInput(e.target.value);
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
