export default function Select() {
    return (
        <div className="grid">
            <h1 className="mb-4">Logo</h1>
            <h3 className="mb-6">D-Ice에 방문하신 것을 환영합니다!</h3>
            <div className="flex space-x-4">
                <a href="/lobby" className="btn btn-primary">
                    게임 참여하기
                </a>
                <a href="/roomSettings" className="btn btn-secondary">
                    방 생성
                </a>
            </div>
        </div>
    );
}
