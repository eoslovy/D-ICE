export default function Select() {
    return (
        <div>
            <h1 className="mb-4">로비 화면</h1>
            <h3 className="mb-6">D-Ice에 방문하신 것을 환영합니다!</h3>
            <div className="flex space-x-4">
                <a href="/lobby" className="btn-warning">
                    게임 참여하기
                </a>
                <a href="/roomSettings" className="btn-secondary">
                    방 생성
                </a>
            </div>
        </div>
    );
}
