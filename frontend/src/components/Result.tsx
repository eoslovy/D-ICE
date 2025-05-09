import { useState, useEffect, useRef } from "react"
import { Trophy, Medal, Frown, ChevronDown, ChevronUp, Play, ArrowRight } from "lucide-react"
interface ResultProps {
  data: AggregatedAdminMessage | null;
  onContinue?: () => void;
}

export default function Result({ data, onContinue }: ResultProps) {
  if (!data) {
    return (
      <div className="error-message">
        <p>데이터를 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }
  
  const [expandedRankings, setExpandedRankings] = useState(false)
  const [activeVideo, setActiveVideo] = useState<"first" | "last" | null>("first") // 기본값을 "first"로 설정
  const [videoEnded, setVideoEnded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  // 비디오 자동 재생 처리
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log("비디오 자동 재생 실패:", err)
      })
    }
  }, [activeVideo])

  const handleVideoEnded = () => {
    setVideoEnded(true)
  }

  const handleShowRankings = () => {
    setVideoEnded(true)
  }

  // 현재 활성화된 비디오 URL 가져오기
  const currentVideoUrl =
    activeVideo === "first" ? data.firstPlace?.videoUrl : activeVideo === "last" ? data.lastPlace?.videoUrl : null

  const fadeInStyle = {
    animation: "fadeIn 0.5s ease-out forwards",
  }
  // 현재 라운드가 마지막 라운드인지 확인
  const isFinalRound = data.currentRound === data.totalRound

  // 표시할 랭킹 데이터 (현재 라운드 또는 전체)
  const rankingData = data.roundRanking

  return (
    <div className="result-container">
      <div className="result-title">
        <h2>{isFinalRound ? "최종 결과" : `${data.gameType || "게임"} 결과`}</h2>
        <p>{isFinalRound ? "모든 게임이 종료되었습니다!" : `라운드 ${data.currentRound}/${data.totalRound} 완료`}</p>
      </div>

      {/* 모바일 레이아웃 */}
      {isMobile ? (
        <div className="flex flex-col">
          {/* 비디오 섹션 (모바일에서 영상이 끝나기 전까지만 표시) */}
          {!videoEnded && (
            <div className="video-container">
              <div className="video-wrapper">
                {currentVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={currentVideoUrl}
                    className="w-full h-full object-cover"
                    controls
                    onEnded={handleVideoEnded}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white">비디오가 없습니다</p>
                  </div>
                )}

                <div className="video-badge">{activeVideo === "first" ? "🏆 우승자 플레이" : "😅 꼴등 플레이"}</div>
              </div>

              {/* 비디오 건너뛰기 버튼 */}
              <button onClick={handleShowRankings} className="video-button">
                <span>순위표 보기</span>
                <ArrowRight size={18} className="ml-2" />
              </button>

              {/* 비디오 전환 버튼 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveVideo("first")}
                  className={`video-toggle-button ${activeVideo === "first" ? "video-toggle-active" : "video-toggle-inactive"}`}
                >
                  <Trophy size={18} />
                  <span>1등 영상</span>
                </button>
                <button
                  onClick={() => setActiveVideo("last")}
                  className={`video-toggle-button ${activeVideo === "last" ? "video-toggle-active" : "video-toggle-inactive"}`}
                >
                  <Frown size={18} />
                  <span>꼴등 영상</span>
                </button>
              </div>
            </div>
          )}

          {/* 순위표 섹션 (모바일에서 영상이 끝난 후에만 표시) */}
          {videoEnded && (
            <div style={fadeInStyle}>
              <div className="rankings-table">
                <div className="rankings-header">순위표</div>

                <div className="rankings-body">
                  {/* 항상 표시되는 상위 3명 */}
                  {rankingData.slice(0, 3).map((player) => {
                    let rankItemClass = "rank-item"

                    if (player.rank === 1) rankItemClass += " rank-item-first"
                    else if (player.rank === 2) rankItemClass += " rank-item-second"
                    else if (player.rank === 3) rankItemClass += " rank-item-third"

                    return (
                      <div key={player.userId} className={rankItemClass}>
                        <div className="rank-number">
                          {player.rank === 1 ? (
                            <Trophy className="text-yellow-500 mx-auto" size={24} />
                          ) : player.rank === 2 ? (
                            <Medal className="text-gray-400 mx-auto" size={24} />
                          ) : (
                            <Medal className="text-amber-700 mx-auto" size={24} />
                          )}
                        </div>
                        <div className="rank-info">
                          <div className="rank-name">{player.nickname}</div>
                          <div className="rank-score">점수: {player.score}</div>
                        </div>
                      </div>
                    )
                  })}

                  {/* 확장 가능한 중간 순위 */}
                  {rankingData.length > 4 && (
                    <>
                      {expandedRankings &&
                        rankingData.slice(3, -1).map((player) => (
                          <div key={player.userId} className="rank-item">
                            <div className="rank-number">{player.rank}</div>
                            <div className="rank-info">
                              <div className="rank-name">{player.nickname}</div>
                              <div className="rank-score">점수: {player.score}</div>
                            </div>
                          </div>
                        ))}

                      {rankingData.length > 4 && (
                        <button
                          onClick={() => setExpandedRankings(!expandedRankings)}
                          className="w-full p-2 text-center text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                        >
                          {expandedRankings ? (
                            <>
                              <ChevronUp size={16} className="mr-1" />
                              접기
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} className="mr-1" />
                              {rankingData.length - 4} 명 더 보기
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* 항상 표시되는 꼴등 */}
                  {rankingData.length > 3 && (
                    <div key={rankingData[rankingData.length - 1].userId} className="rank-item">
                      <div className="rank-number">
                        <Frown className="text-red-500" size={24} />
                      </div>
                      <div className="rank-info">
                        <div className="rank-name">{rankingData[rankingData.length - 1].nickname}</div>
                        <div className="rank-score">점수: {rankingData[rankingData.length - 1].score}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 비디오 다시 보기 버튼 */}
              <button onClick={() => setVideoEnded(false)} className="video-button mt-4">
                <Play size={18} className="mr-2" />
                <span>영상 다시 보기</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 데스크톱 레이아웃 (기존 그리드 유지) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 비디오 섹션 */}
          <div className="flex flex-col">
            <div className="video-wrapper mb-4">
              {currentVideoUrl ? (
                <video ref={videoRef} src={currentVideoUrl} className="w-full h-full object-cover" controls />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white">비디오가 없습니다</p>
                </div>
              )}

              <div className="video-badge">{activeVideo === "first" ? "🏆 우승자 플레이" : "😅 꼴등 플레이"}</div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveVideo("first")}
                className={`video-toggle-button ${activeVideo === "first" ? "video-toggle-active" : "video-toggle-inactive"}`}
              >
                <Trophy size={18} />
                <span>1등 영상</span>
              </button>
              <button
                onClick={() => setActiveVideo("last")}
                className={`video-toggle-button ${activeVideo === "last" ? "video-toggle-active" : "video-toggle-inactive"}`}
              >
                <Frown size={18} />
                <span>꼴등 영상</span>
              </button>
            </div>
          </div>

          {/* 순위표 섹션 */}
          <div>
            <div className="rankings-table">
              <div className="rankings-header">순위표</div>

              <div className="rankings-body">
                {/* 항상 표시되는 상위 3명 */}
                {rankingData.slice(0, 3).map((player) => {
                  let rankItemClass = "rank-item"

                  if (player.rank === 1) rankItemClass += " rank-item-first"
                  else if (player.rank === 2) rankItemClass += " rank-item-second"
                  else if (player.rank === 3) rankItemClass += " rank-item-third"

                  return (
                    <div key={player.userId} className={rankItemClass}>
                      <div className="rank-number">
                        {player.rank === 1 ? (
                          <Trophy className="text-yellow-500 mx-auto" size={24} />
                        ) : player.rank === 2 ? (
                          <Medal className="text-gray-400 mx-auto" size={24} />
                        ) : (
                          <Medal className="text-amber-700 mx-auto" size={24} />
                        )}
                      </div>
                      <div className="rank-info">
                        <div className="rank-name">{player.nickname}</div>
                        <div className="rank-score">점수: {player.score}</div>
                      </div>
                    </div>
                  )
                })}

                {/* 확장 가능한 중간 순위 */}
                {rankingData.length > 4 && (
                  <>
                    {expandedRankings &&
                      rankingData.slice(3, -1).map((player) => (
                        <div key={player.userId} className="rank-item">
                          <div className="rank-number">{player.rank}</div>
                          <div className="rank-info">
                            <div className="rank-name">{player.nickname}</div>
                            <div className="rank-score">점수: {player.score}</div>
                          </div>
                        </div>
                      ))}

                    {rankingData.length > 4 && (
                      <button
                        onClick={() => setExpandedRankings(!expandedRankings)}
                        className="w-full p-2 text-center text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                      >
                        {expandedRankings ? (
                          <>
                            <ChevronUp size={16} className="mr-1" />
                            접기
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} className="mr-1" />
                            {rankingData.length - 4} 명 더 보기
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* 항상 표시되는 꼴등 */}
                {rankingData.length > 3 && (
                  <div key={rankingData[rankingData.length - 1].userId} className="rank-item">
                    <div className="rank-number">
                      <Frown className="text-red-500" size={24} />
                    </div>
                    <div className="rank-info">
                      <div className="rank-name">{rankingData[rankingData.length - 1].nickname}</div>
                      <div className="rank-score">점수: {rankingData[rankingData.length - 1].score}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계속하기 버튼 */}
      {onContinue && (
        <div className="continue-button">
          <button onClick={onContinue} className="btn btn-primary inline-flex items-center">
            <Play size={20} className="mr-2" />
            {isFinalRound ? "새 게임 시작하기" : "다음 게임으로"}
          </button>
        </div>
      )}
    </div>
  )
}
