import { useState, useEffect, useRef, useCallback } from "react"
import { Trophy, Medal, Frown, ChevronDown, ChevronUp, Play, ArrowRight } from "lucide-react"
import ConfettiEffect from "./ConfettiEffect"
interface ResultProps {
  data: AggregatedAdminMessage | null
  onContinue?: () => void
}

export default function Result({ data, onContinue }: ResultProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [expandedRankings, setExpandedRankings] = useState(false)
  const [activeVideo, setActiveVideo] = useState<"first" | "last" | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [initialActiveVideo, setInitialActiveVideo] = useState<"first" | "last" | null>(null)

  if (!data) {
    return (
      <div className="error-message">
        <p>데이터를 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }

  // 비디오 URL 확인 및 초기 상태 설정
  const firstVideoUrl = data.firstPlace?.videoUrl || null
  const lastVideoUrl = data.lastPlace?.videoUrl || null
  const hasAnyVideo = !!(firstVideoUrl || lastVideoUrl)

  // 초기 비디오 설정 및 순위표 표시 여부 결정
  useEffect(() => {
    if (firstVideoUrl) {
      setInitialActiveVideo("first")
    } else if (lastVideoUrl) {
      setInitialActiveVideo("last")
    }

    if (!hasAnyVideo) {
      setVideoEnded(true)
      setShowConfetti(true)
    }
  }, [hasAnyVideo, firstVideoUrl, lastVideoUrl])

  useEffect(() => {
    setActiveVideo(initialActiveVideo)
  }, [initialActiveVideo])

  // 모바일 여부 확인
  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [checkMobile])

  // 비디오 자동 재생 처리
  useEffect(() => {
    if (videoRef.current && activeVideo) {
      videoRef.current?.play().catch((err) => {
        console.log("비디오 자동 재생 실패:", err)
      })
    }
  }, [activeVideo])

  const handleVideoEnded = () => {
    setVideoEnded(true)
    // 컨페티 표시
    setShowConfetti(true)
  }

  const handleShowRankings = () => {
    setVideoEnded(true)
    // 컨페티 표시
    setShowConfetti(true)
  }

  const handleConfettiComplete = () => {
    // 컨페티 애니메이션이 완료되면 호출됨
    console.log("컨페티 애니메이션 완료")
  }

  // 현재 활성화된 비디오 URL 가져오기
  const currentVideoUrl = activeVideo === "first" ? firstVideoUrl : activeVideo === "last" ? lastVideoUrl : null

  const fadeInStyle = {
    animation: "fadeIn 0.5s ease-out forwards",
  }

  // 현재 라운드가 마지막 라운드인지 확인
  const isFinalRound = data.currentRound === data.totalRound

  // 표시할 랭킹 데이터 (현재 라운드 또는 전체)
  const rankingData = data.roundRanking

  useEffect(() => {
    if (data && isFinalRound && videoEnded) {
      setShowConfetti(true)
    }
  }, [data, isFinalRound, videoEnded])

  return (
    <div className="result-container">
      {/* 컨페티 효과 컴포넌트 */}
      <ConfettiEffect
        isActive={showConfetti}
        duration={8000}
        continuous={isFinalRound} // 최종 라운드에서는 지속적인 컨페티 효과
        onComplete={handleConfettiComplete}
      />

      <div className="result-title">
        <h2>{isFinalRound ? "최종 결과" : `${data.gameType || "게임"} 결과`}</h2>
        <p>{isFinalRound ? "모든 게임이 종료되었습니다!" : `라운드 ${data.currentRound}/${data.totalRound} 완료`}</p>
      </div>

      {/* 모바일 레이아웃 */}
      {isMobile ? (
        <div className="flex flex-col items-center w-full">
          {/* 비디오 섹션 (모바일에서 영상이 끝나기 전까지만 표시) */}
          {!videoEnded && hasAnyVideo && currentVideoUrl && (
            <div className="video-container w-full">
              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  src={currentVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                  onEnded={handleVideoEnded}
                />
                <div className="video-badge">{activeVideo === "first" ? "🏆 우승자 플레이" : "😅 꼴등 플레이"}</div>
              </div>

              {/* 비디오 건너뛰기 버튼 */}
              <button onClick={handleShowRankings} className="video-button">
                <span>순위표 보기</span>
                <ArrowRight size={18} className="ml-2" />
              </button>

              {/* 비디오 전환 버튼 */}
              <div className="flex gap-2 mt-4 w-full">
                <button
                  onClick={() => setActiveVideo("first")}
                  disabled={!firstVideoUrl}
                  className={`video-toggle-button ${activeVideo === "first" ? "video-toggle-active" : "video-toggle-inactive"} ${
                    !firstVideoUrl ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Trophy size={18} />
                  <span>1등 영상</span>
                </button>
                <button
                  onClick={() => setActiveVideo("last")}
                  disabled={!lastVideoUrl}
                  className={`video-toggle-button ${activeVideo === "last" ? "video-toggle-active" : "video-toggle-inactive"} ${
                    !lastVideoUrl ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Frown size={18} />
                  <span>꼴등 영상</span>
                </button>
              </div>
            </div>
          )}

          {/* 순위표 섹션 (모바일에서 영상이 끝난 후에만 표시) */}
          {(videoEnded || !hasAnyVideo) && (
            <div style={fadeInStyle} className="w-full">
              <div className="rankings-table">
                <div className="rankings-header text-center">순위표</div>

                <div className="rankings-body">
                  {/* 항상 표시되는 상위 3명 */}
                  {rankingData.slice(0, Math.min(3, rankingData.length)).map((player) => {
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

              {/* 비디오 다시 보기 버튼 (비디오가 있을 때만 표시) */}
              {hasAnyVideo && activeVideo && (
                <button onClick={() => setVideoEnded(false)} className="video-button mt-4">
                  <Play size={18} className="mr-2" />
                  <span>영상 다시 보기</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 데스크톱 레이아웃 */
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          {/* 비디오 섹션 */}
          <div className={`flex flex-col ${!hasAnyVideo || !currentVideoUrl ? "md:w-0" : "md:w-1/2"}`}>
            {hasAnyVideo && currentVideoUrl && (
              <>
                <div className="video-wrapper mb-4">
                  <video ref={videoRef} src={currentVideoUrl} className="w-full h-full object-cover" controls />
                  <div className="video-badge">{activeVideo === "first" ? "🏆 우승자 플레이" : "😅 꼴등 플레이"}</div>
                </div>

                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setActiveVideo("first")}
                    disabled={!firstVideoUrl}
                    className={`video-toggle-button ${activeVideo === "first" ? "video-toggle-active" : "video-toggle-inactive"} ${
                      !firstVideoUrl ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Trophy size={18} />
                    <span>1등 영상</span>
                  </button>
                  <button
                    onClick={() => setActiveVideo("last")}
                    disabled={!lastVideoUrl}
                    className={`video-toggle-button ${activeVideo === "last" ? "video-toggle-active" : "video-toggle-inactive"} ${
                      !lastVideoUrl ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Frown size={18} />
                    <span>꼴등 영상</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 순위표 섹션 */}
          <div className={`${!hasAnyVideo || !currentVideoUrl ? "md:w-full max-w-md mx-auto" : "md:w-1/2"}`}>
            <div className="rankings-table">
              <div className="rankings-header text-center">순위표</div>

              <div className="rankings-body">
                {/* 항상 표시되는 상위 3명 */}
                {rankingData.slice(0, Math.min(3, rankingData.length)).map((player) => {
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
                            <div className="rank-score">{player.score}</div>
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
            {isFinalRound ? "최종 결과 확인하기" : "다음 게임으로"}
          </button>
        </div>
      )}
    </div>
  )
}
