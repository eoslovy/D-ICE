import { useState } from "react";

export default function UserRoom() {
    const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "닉네임");
    const [newNickname, setNewNickname] = useState("");

    const handleNicknameChange = () => {
        if (!newNickname.trim()) {
            alert("닉네임을 입력해주세요.");
            return;
        }

        localStorage.setItem("nickname", newNickname);

        setNickname(newNickname);
        setNewNickname("");

        alert("닉네임이 변경되었습니다.");
    };

    return (
        <div>
            <h1>대기중...</h1>

            <div>
                <h2>닉네임: {nickname}</h2>
                <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="닉네임을 입력하세요"
                    className="flex-1 border rounded px-3 py-2"
                />
                <button
                    onClick={handleNicknameChange}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                    닉네임 변경
                </button>
            </div>
        </div>
    );
}
