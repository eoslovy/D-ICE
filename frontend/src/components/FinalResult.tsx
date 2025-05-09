import { useState, useEffect } from "react"
import { Trophy, Medal, Crown, Star, Play } from "lucide-react"

interface FinalResultProps {
  finalData: EndMessage | null;
  onContinue: () => void;
}

export default function FinalResult({ finalData, onContinue }: FinalResultProps) {
  const [sortedPlayers, setSortedPlayers] = useState<RankingInfo[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // 모바일 여부 확인
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // 순위 계산 및 정렬
  useEffect(() => {
    if (finalData) {
      setShowConfetti(true)
      const withRanks = [...finalData.overallRanking] // or `data.overallRanking` based on your needs
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
          ...player,
          rank: index + 1,
        }))

      setSortedPlayers(withRanks)
    }
  }, [finalData])

  // 상위 3명 플레이어
  const topThreePlayers = sortedPlayers.slice(0, 3)
  const fadeInStyle = {
    animation: "fadeIn 0.5s ease-out forwards",
  }
  

  
  return (
    <div className="result-container">
      {showConfetti && (
        <div className="confetti-container">
          <div className="confetti-wrapper">
            {Array.from({ length: 100 }).map((_, i) => {
              const size = Math.random() * 10 + 5
              const color = [
                "#FFD700", // 금색
                "#E84545", // 빨간색
                "#42CAFD", // 하늘색
                "#2A9D8F", // 청록색
                "#EBEBD3", // 크림색
              ][Math.floor(Math.random() * 5)]

              return (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    borderRadius: Math.random() > 0.5 ? "50%" : "0",
                    left: `${Math.random() * 100}%`,
                    top: `-${size}px`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${Math.random() * 3 + 2}s`,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="result-title">
        <h2>🏆 최종 결과 🏆</h2>
        <p>모든 게임이 종료되었습니다!</p>
      </div>

      {/* 모바일 레이아웃 */}
      {isMobile ? (
            <div style={fadeInStyle}>
              {/* 상위 3명 포디움 */}
              <div className="podium-container">
                <h3 className="podium-title">🏆 우승자 🏆</h3>

                <div className={`podium-layout podium-mobile`}>
                  {/* 2등 */}
                  {topThreePlayers.length > 1 && (
                    <div className={`podium-position podium-second podium-second-mobile`}>
                      <div className="podium-avatar podium-avatar-second">
                        <div className="podium-avatar-text podium-avatar-text-second">
                          {topThreePlayers[1].nickname.charAt(0)}
                        </div>
                      </div>
                      <div className="podium-info">
                        <Medal className="podium-icon-second" size={24} />
                        <div className="podium-name">{topThreePlayers[1].nickname}</div>
                        <div className="podium-score">{topThreePlayers[1].score}점</div>
                      </div>
                      <div className="podium-base podium-base-second podium-base-second-mobile"></div>
                    </div>
                  )}

                  {/* 1등 */}
                  {topThreePlayers.length > 0 && (
                    <div className={`podium-position podium-first podium-first-mobile`}>
                      <div className="podium-avatar podium-avatar-first podium-avatar-first-mobile">
                        <div className="podium-avatar-text podium-avatar-text-first">
                          {topThreePlayers[0].nickname.charAt(0)}
                        </div>
                      </div>
                      <div className="podium-info">
                        <Crown className="podium-icon-first" size={28} />
                        <div className="podium-name podium-name-first">{topThreePlayers[0].nickname}</div>
                        <div>{topThreePlayers[0].score}점</div>
                      </div>
                      <div className="podium-base podium-base-first podium-base-first-mobile"></div>
                    </div>
                  )}

                  {/* 3등 */}
                  {topThreePlayers.length > 2 && (
                    <div className={`podium-position podium-third podium-third-mobile`}>
                      <div className="podium-avatar podium-avatar-third">
                        <div className="podium-avatar-text podium-avatar-text-third">
                          {topThreePlayers[2].nickname.charAt(0)}
                        </div>
                      </div>
                      <div className="podium-info">
                        <Medal className="podium-icon-third" size={24} />
                        <div className="podium-name">{topThreePlayers[2].nickname}</div>
                        <div className="podium-score">{topThreePlayers[2].score}점</div>
                      </div>
                      <div className="podium-base podium-base-third podium-base-third-mobile"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 전체 순위표 */}
              <div className="rankings-table">
                <div className="rankings-header">전체 순위표</div>
                <div className="rankings-body">
                  {sortedPlayers.map((player) => {
                    const playerRank = player.rank || 0
                    let rankItemClass = "rank-item"

                    if (playerRank === 1) rankItemClass += " rank-item-first"
                    else if (playerRank === 2) rankItemClass += " rank-item-second"
                    else if (playerRank === 3) rankItemClass += " rank-item-third"

                    return (
                      <div key={player.rank} className={rankItemClass}>
                        <div className="rank-number">
                          {playerRank === 1 ? (
                            <Trophy className="text-yellow-500 mx-auto" size={24} />
                          ) : playerRank === 2 ? (
                            <Medal className="text-gray-400 mx-auto" size={24} />
                          ) : playerRank === 3 ? (
                            <Medal className="text-amber-700 mx-auto" size={24} />
                          ) : (
                            playerRank
                          )}
                        </div>
                        <div className="rank-info">
                          <div className="rank-name">{player.nickname}</div>
                          <div className="rank-score">점수: {player.score}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
      ) : (
        /* 데스크톱 레이아웃 */
        <div className="grid grid-cols-1 gap-6">
          {/* 상위 3명 포디움 */}
          <div className={`podium-layout podium-desktop`}>
            {/* 2등 */}
            {topThreePlayers.length > 1 && (
              <div className={`podium-position podium-second podium-second-desktop`}>
                <div className="podium-avatar podium-avatar-second">
                  <div className="podium-avatar-text podium-avatar-text-second">
                    {topThreePlayers[1].nickname.charAt(0)}
                  </div>
                </div>
                <div className="podium-info">
                  <Medal className="podium-icon-second" size={28} />
                  <div className="podium-name podium-name-first">{topThreePlayers[1].nickname}</div>
                  <div>{topThreePlayers[1].score}점</div>
                </div>
                <div className="podium-base podium-base-second podium-base-second-desktop"></div>
              </div>
            )}

            {/* 1등 */}
            {topThreePlayers.length > 0 && (
              <div className={`podium-position podium-first podium-first-desktop`}>
                <div className="podium-avatar podium-avatar-first podium-avatar-first-desktop">
                  <div className="podium-avatar-text podium-avatar-text-first">
                    {topThreePlayers[0].nickname.charAt(0)}
                  </div>
                </div>
                <div className="podium-info">
                  <Crown className="podium-icon-first" size={32} />
                  <div className="podium-name podium-name-first">{topThreePlayers[0].nickname}</div>
                  <div className="text-lg">{topThreePlayers[0].score}점</div>
                </div>
                <div className="podium-base podium-base-first podium-base-first-desktop"></div>
              </div>
            )}

            {/* 3등 */}
            {topThreePlayers.length > 2 && (
              <div className={`podium-position podium-third podium-third-desktop`}>
                <div className="podium-avatar podium-avatar-third">
                  <div className="podium-avatar-text podium-avatar-text-third">
                    {topThreePlayers[2].nickname.charAt(0)}
                  </div>
                </div>
                <div className="podium-info">
                  <Medal className="podium-icon-third" size={28} />
                  <div className="podium-name podium-name-first">{topThreePlayers[2].nickname}</div>
                  <div>{topThreePlayers[2].score}점</div>
                </div>
                <div className="podium-base podium-base-third podium-base-third-desktop"></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 전체 순위표 */}
            <div>
              <h3 className="text-xl font-bold mb-2">전체 순위표</h3>
              <div className="rankings-table">
                <div className="rankings-header">순위</div>
                <div className="rankings-body">
                  {sortedPlayers.map((player) => {
                    const playerRank = player.rank || 0
                    let rankItemClass = "rank-item"

                    if (playerRank === 1) rankItemClass += " rank-item-first"
                    else if (playerRank === 2) rankItemClass += " rank-item-second"
                    else if (playerRank === 3) rankItemClass += " rank-item-third"

                    return (
                      <div key={player.rank} className={rankItemClass}>
                        <div className="rank-number">
                          {playerRank === 1 ? (
                            <Trophy className="text-yellow-500 mx-auto" size={24} />
                          ) : playerRank === 2 ? (
                            <Medal className="text-gray-400 mx-auto" size={24} />
                          ) : playerRank === 3 ? (
                            <Medal className="text-amber-700 mx-auto" size={24} />
                          ) : (
                            playerRank
                          )}
                        </div>
                        <div className="rank-info">
                          <div className="rank-name">{player.nickname}</div>
                          <div className="rank-score">점수: {player.score}</div>
                        </div>
                        {playerRank <= 3 && (
                          <Star
                            className={`
                              ${
                                playerRank === 1
                                  ? "text-yellow-500"
                                  : playerRank === 2
                                    ? "text-gray-400"
                                    : "text-amber-700"
                              }
                            `}
                            size={20}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계속하기 버튼 */}
      {onContinue && (
        <div className="continue-button">
          <button onClick={onContinue} className="btn btn-primary inline-flex items-center">
            <Play size={20} className="mr-2" />새 게임 시작하기
          </button>
        </div>
      )}
    </div>
  )
}
