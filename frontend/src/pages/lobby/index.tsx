import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrReader } from "react-qr-reader";

// 실제 서비스에서는 Redis/WebSocket 등을 통한 방 체크
const checkRoomExists = async (code: string): Promise<boolean> => {
    const existingRooms = ["room1", "room2"];
    return existingRooms.includes(code);
};

export default function Lobby() {
    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
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

    const handleScan = async (scannedCode: string | null) => {
        if (!scannedCode || isProcessingScan) return;
        setIsProcessingScan(true);
        setShowQrScanner(false);

        if (!(await checkRoomExists(scannedCode))) {
            setErrorMessage("해당 방이 존재하지 않습니다.");
            setIsProcessingScan(false);
            return;
        }

        sessionStorage.setItem("roomcode", scannedCode);
        navigate(`/${scannedCode}`);
    };

    const handleError = (err: any) => {
        setErrorMessage("QR 코드 인식 중 오류가 발생했습니다.");
        setShowQrScanner(false);
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

            {/* QR 코드 스캔 버튼 */}
            <div className="mb-6">
                <button
                    className="bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2"
                    onClick={() => {
                        setShowQrScanner(true);
                        setErrorMessage("");
                    }}
                >
                    QR 코드로 입장
                </button>
            </div>

            {/* QR 코드 스캐너 */}
            {showQrScanner && (
                <div className="mb-6">
                    <QrReader
                        scanDelay={300}
                        onResult={(result, error) => {
                            if (!!result) {
                                handleScan(result.getText());
                            }
                            if (!!error) {
                                handleError(error);
                            }
                        }}
                        constraints={{ facingMode: "environment" }}
                        videoStyle={{ width: "100%" }}
                    />

                    <button
                        className="mt-4 bg-gray-500 hover:bg-gray-600 text-white rounded px-4 py-2"
                        onClick={() => setShowQrScanner(false)}
                    >
                        닫기
                    </button>
                </div>
            )}

            {/* 에러 메시지 출력 */}
            {errorMessage && (
                <p className="text-red-600 font-semibold">{errorMessage}</p>
            )}
        </div>
    );
}
