import GameCard from "../../components/GameCard";
import { Users, Settings } from "lucide-react";


export default function Select() {
    return (
        <div className="game-container">
            <GameCard>
                <div>
                    <img
                        src="/assets/logo.png"
                        alt="D-Ice Logo"
                        className="mx-auto h-36 w-auto"
                    />
                </div>
                <h1 className="game-title">Welcome to D-Ice!</h1>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <a
                        href="/lobby"
                        className="btn btn-primary flex items-center justify-center"
                    >
                        <Users className="mr-2" size={20} />
                        참여하기
                    </a>
                    <a
                        href="/roomSettings"
                        className="btn btn-secondary flex items-center justify-center"
                    >
                        <Settings className="mr-2" size={20} />방 생성하기
                    </a>
                </div>
            </GameCard>
        </div>
    );
}
