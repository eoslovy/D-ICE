import { useState } from "react";
import GameCard from "../../components/GameCard";
import { User, Save } from "lucide-react";

export default function UserRoom() {
    const [nickname, setNickname] = useState(
        localStorage.getItem("nickname") || "닉네임"
    );
    const [newNickname, setNewNickname] = useState("");
    const [isChanging, setIsChanging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleNicknameChange = () => {
        if (!newNickname.trim()) {
            alert("닉네임을 입력해주세요.");
            return;
        }

        setTimeout(() => {
            localStorage.setItem("nickname", newNickname);
            setNickname(newNickname);
            setNewNickname("");
            setIsChanging(false);
            setShowSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        }, 500);
    };

    return (
        <div className="game-container">
            <GameCard>
                <h1 className="game-title">프로필 설정</h1>

                <div className="mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                            <User size={40} />
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-sm font-medium mb-1">
                            현재 닉네임
                        </div>
                        <div className="text-xl font-bold">{nickname}</div>
                    </div>

                    <div className="mb-4">
                        <label
                            htmlFor="newNickname"
                            className="block text-sm font-medium mb-1"
                        >
                            변경할 닉네임
                        </label>
                        <input
                            id="newNickname"
                            type="text"
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            placeholder="변경할 닉네임을 입력하세요."
                            className="input-field"
                            disabled={isChanging}
                        />
                    </div>

                    <button
                        onClick={handleNicknameChange}
                        className={`btn btn-primary w-full flex items-center justify-center ${
                            isChanging ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        disabled={isChanging || !newNickname.trim()}
                    >
                        {isChanging ? (
                            <span>닉네임 변경중...</span>
                        ) : (
                            <>
                                <Save className="mr-2" size={20} />
                                닉네임 변경
                            </>
                        )}
                    </button>

                    {showSuccess && (
                        <div className="mt-4 p-2 bg-green-100 text-green-800 rounded-md text-center">
                            닉네임이 성공적으로 변경되었습니다!
                        </div>
                    )}
                </div>
            </GameCard>
        </div>
    );
}
