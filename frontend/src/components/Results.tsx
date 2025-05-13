import { useState, useEffect, useRef, useCallback } from "react";
import {
    Trophy,
    Medal,
    Crown,
    Star,
    Frown,
    ChevronDown,
    ChevronUp,
    Play,
    ArrowRight,
} from "lucide-react";
import ConfettiEffect from "./ConfettiEffect";

interface ResultProps {
    data: AggregatedAdminMessage | null;
    finalData?: EndMessage | null;
    onContinue?: () => void;
    newGame?: () => void;
    goLobby?: () => void;
    isFinalView?: boolean;
}

export default function Result({
    data,
    finalData,
    onContinue,
    goLobby,
    isFinalView = false,
}: ResultProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [expandedRankings, setExpandedRankings] = useState(false);
    const [activeVideo, setActiveVideo] = useState<"first" | "last" | null>(
        null
    );
    const [videoEnded, setVideoEnded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [initialActiveVideo, setInitialActiveVideo] = useState<
        "first" | "last" | null
    >(null);
    const [sortedPlayers, setSortedPlayers] = useState<RankingInfo[]>([]);

    // 모바일 여부 확인
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    useEffect(() => {
        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, [checkMobile]);

    // 일반 라운드 결과 처리
    useEffect(() => {
        if (!isFinalView && data) {
            // 비디오 URL 확인 및 초기 상태 설정
            const firstVideoUrl = data.firstPlace?.videoUrl || null;
            const lastVideoUrl = data.lastPlace?.videoUrl || null;
            const hasAnyVideo = !!(firstVideoUrl || lastVideoUrl);

            // 초기 비디오 설정
            if (firstVideoUrl) {
                setInitialActiveVideo("first");
            } else if (lastVideoUrl) {
                setInitialActiveVideo("last");
            }

            if (!hasAnyVideo) {
                setVideoEnded(true);
                setShowConfetti(true);
            }
        }
    }, [data, isFinalView]);

    // 최종 결과 처리
    useEffect(() => {
        if (isFinalView && finalData) {
            setVideoEnded(true); // 최종 결과에서는 비디오 표시 안함
            setShowConfetti(true);

            // 순위 계산 및 정렬
            const withRanks = [...finalData.overallRanking]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => ({
                    ...player,
                    rank: index + 1,
                }));

            setSortedPlayers(withRanks);
        }
    }, [finalData, isFinalView]);

    // 비디오 초기 설정
    useEffect(() => {
        setActiveVideo(initialActiveVideo);
    }, [initialActiveVideo]);

    // 비디오 자동 재생 처리
    useEffect(() => {
        if (videoRef.current && activeVideo) {
            videoRef.current?.play().catch((err) => {
                console.log("비디오 자동 재생 실패:", err);
            });
        }
    }, [activeVideo]);

    // 현재 라운드가 마지막 라운드인지 확인
    const isFinalRound = data?.currentRound === data?.totalRound;

    // 표시할 랭킹 데이터 (일반 라운드 또는 최종 결과)
    const rankingData =
        isFinalView && finalData ? sortedPlayers : data?.roundRanking || [];

    // 최종 라운드에서 비디오가 끝났을 때 컨페티 표시
    useEffect(() => {
        if (data && isFinalRound && videoEnded && !isFinalView) {
            setShowConfetti(true);
        }
    }, [data, isFinalRound, videoEnded, isFinalView]);

    // 비디오 URL 확인
    const firstVideoUrl =
        !isFinalView && data ? data.firstPlace?.videoUrl || null : null;
    const lastVideoUrl =
        !isFinalView && data ? data.lastPlace?.videoUrl || null : null;
    const hasAnyVideo = !!(firstVideoUrl || lastVideoUrl);

    // 현재 활성화된 비디오 URL 가져오기
    const currentVideoUrl =
        activeVideo === "first"
            ? firstVideoUrl
            : activeVideo === "last"
            ? lastVideoUrl
            : null;

    const handleVideoEnded = () => {
        setVideoEnded(true);
        setShowConfetti(true);
    };

    const handleShowRankings = () => {
        setVideoEnded(true);
        setShowConfetti(true);
    };

    const handleConfettiComplete = () => {
        console.log("컨페티 애니메이션 완료");
    };

    const fadeInStyle = {
        animation: "fadeIn 0.5s ease-out forwards",
    };

    // 데이터가 없는 경우 에러 메시지 표시
    if (!data && !finalData) {
        return (
            <div className="error-message">
                <p>
                    데이터를 가져오는 데 실패했습니다. 잠시 후 다시
                    시도해주세요.
                </p>
            </div>
        );
    }

    // 최종 결과 화면에서 사용할 상위 3명 플레이어
    const topThreePlayers =
        isFinalView && sortedPlayers.length > 0
            ? sortedPlayers.slice(0, 3)
            : [];

    return (
        <div className="result-container">
            {/* 컨페티 효과 컴포넌트 */}
            <ConfettiEffect
                isActive={showConfetti}
                duration={8000}
                continuous={isFinalView || isFinalRound} // 최종 라운드나 최종 결과에서는 지속적인 컨페티 효과
                onComplete={handleConfettiComplete}
            />

            <div className="result-title">
                {isFinalView ? (
                    <>
                        <h2>🏆 최종 결과 🏆</h2>
                        <p>모든 게임이 종료되었습니다!</p>
                    </>
                ) : (
                    <>
                        <h2>
                            {isFinalRound
                                ? "최종 결과"
                                : `${data?.gameType || "게임"} 결과`}
                        </h2>
                        <p>
                            {isFinalRound
                                ? "모든 게임이 종료되었습니다!"
                                : `라운드 ${data?.currentRound}/${data?.totalRound} 완료`}
                        </p>
                    </>
                )}
            </div>

            {/* 모바일 레이아웃 */}
            {isMobile ? (
                <div className="flex flex-col items-center w-full">
                    {/* 비디오 섹션 (최종 결과가 아니고, 모바일에서 영상이 끝나기 전까지만 표시) */}
                    {!isFinalView &&
                        !videoEnded &&
                        hasAnyVideo &&
                        currentVideoUrl && (
                            <div className="video-container w-full">
                                <div className="video-wrapper">
                                    <video
                                        ref={videoRef}
                                        src={currentVideoUrl}
                                        className="w-full h-full object-cover"
                                        controls
                                        onEnded={handleVideoEnded}
                                    />
                                    <div className="video-badge">
                                        {activeVideo === "first"
                                            ? "🏆 우승자 플레이"
                                            : "😅 꼴등 플레이"}
                                    </div>
                                </div>

                                {/* 비디오 건너뛰기 버튼 */}
                                <button
                                    onClick={handleShowRankings}
                                    className="video-button"
                                >
                                    <span>순위표 보기</span>
                                    <ArrowRight size={18} className="ml-2" />
                                </button>

                                {/* 비디오 전환 버튼 */}
                                <div className="flex gap-2 mt-4 w-full">
                                    <button
                                        onClick={() => setActiveVideo("first")}
                                        disabled={!firstVideoUrl}
                                        className={`video-toggle-button ${
                                            activeVideo === "first"
                                                ? "video-toggle-active"
                                                : "video-toggle-inactive"
                                        } ${
                                            !firstVideoUrl
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""
                                        }`}
                                    >
                                        <Trophy size={18} />
                                        <span>1등 영상</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveVideo("last")}
                                        disabled={!lastVideoUrl}
                                        className={`video-toggle-button ${
                                            activeVideo === "last"
                                                ? "video-toggle-active"
                                                : "video-toggle-inactive"
                                        } ${
                                            !lastVideoUrl
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""
                                        }`}
                                    >
                                        <Frown size={18} />
                                        <span>꼴등 영상</span>
                                    </button>
                                </div>
                            </div>
                        )}

                    {/* 최종 결과 포디움 (최종 결과일 때만 표시) */}
                    {isFinalView && (
                        <div style={fadeInStyle}>
                            {/* 상위 3명 포디움 */}
                            <div className="podium-container">
                                <h3 className="podium-title">🏆 우승자 🏆</h3>

                                <div className={`podium-layout podium-mobile`}>
                                    {/* 2등 */}
                                    {topThreePlayers.length > 1 && (
                                        <div
                                            className={`podium-position podium-second podium-second-mobile`}
                                        >
                                            <div className="podium-avatar podium-avatar-second">
                                                <div className="podium-avatar-text podium-avatar-text-second">
                                                    {topThreePlayers[1].nickname.charAt(
                                                        0
                                                    )}
                                                </div>
                                            </div>
                                            <div className="podium-info">
                                                <Medal
                                                    className="podium-icon-second"
                                                    size={24}
                                                />
                                                <div className="podium-name">
                                                    {
                                                        topThreePlayers[1]
                                                            .nickname
                                                    }
                                                </div>
                                                <div className="podium-score">
                                                    {topThreePlayers[1].score}점
                                                </div>
                                            </div>
                                            <div className="podium-base podium-base-second podium-base-second-mobile"></div>
                                        </div>
                                    )}

                                    {/* 1등 */}
                                    {topThreePlayers.length > 0 && (
                                        <div
                                            className={`podium-position podium-first podium-first-mobile`}
                                        >
                                            <div className="podium-avatar podium-avatar-first podium-avatar-first-mobile">
                                                <div className="podium-avatar-text podium-avatar-text-first">
                                                    {topThreePlayers[0].nickname.charAt(
                                                        0
                                                    )}
                                                </div>
                                            </div>
                                            <div className="podium-info">
                                                <Crown
                                                    className="podium-icon-first"
                                                    size={28}
                                                />
                                                <div className="podium-name podium-name-first">
                                                    {
                                                        topThreePlayers[0]
                                                            .nickname
                                                    }
                                                </div>
                                                <div>
                                                    {topThreePlayers[0].score}점
                                                </div>
                                            </div>
                                            <div className="podium-base podium-base-first podium-base-first-mobile"></div>
                                        </div>
                                    )}

                                    {/* 3등 */}
                                    {topThreePlayers.length > 2 && (
                                        <div
                                            className={`podium-position podium-third podium-third-mobile`}
                                        >
                                            <div className="podium-avatar podium-avatar-third">
                                                <div className="podium-avatar-text podium-avatar-text-third">
                                                    {topThreePlayers[2].nickname.charAt(
                                                        0
                                                    )}
                                                </div>
                                            </div>
                                            <div className="podium-info">
                                                <Medal
                                                    className="podium-icon-third"
                                                    size={24}
                                                />
                                                <div className="podium-name">
                                                    {
                                                        topThreePlayers[2]
                                                            .nickname
                                                    }
                                                </div>
                                                <div className="podium-score">
                                                    {topThreePlayers[2].score}점
                                                </div>
                                            </div>
                                            <div className="podium-base podium-base-third podium-base-third-mobile"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 순위표 섹션 (모바일에서 영상이 끝난 후에만 표시) */}
                    {(videoEnded || !hasAnyVideo || isFinalView) && (
                        <div style={fadeInStyle} className="w-full">
                            <div className="rankings-table">
                                <div className="rankings-header text-center">
                                    {isFinalView ? "전체 순위표" : "순위표"}
                                </div>

                                <div className="rankings-body">
                                    {/* 항상 표시되는 상위 3명 */}
                                    {rankingData
                                        .slice(
                                            0,
                                            Math.min(3, rankingData.length)
                                        )
                                        .map((player) => {
                                            let rankItemClass = "rank-item";
                                            const playerRank = player.rank || 0;

                                            if (playerRank === 1)
                                                rankItemClass +=
                                                    " rank-item-first";
                                            else if (playerRank === 2)
                                                rankItemClass +=
                                                    " rank-item-second";
                                            else if (playerRank === 3)
                                                rankItemClass +=
                                                    " rank-item-third";

                                            return (
                                                <div
                                                    key={
                                                        player.userId ||
                                                        playerRank
                                                    }
                                                    className={rankItemClass}
                                                >
                                                    <div className="rank-number">
                                                        {playerRank === 1 ? (
                                                            <Trophy
                                                                className="text-yellow-500 mx-auto"
                                                                size={24}
                                                            />
                                                        ) : playerRank === 2 ? (
                                                            <Medal
                                                                className="text-gray-400 mx-auto"
                                                                size={24}
                                                            />
                                                        ) : playerRank === 3 ? (
                                                            <Medal
                                                                className="text-amber-700 mx-auto"
                                                                size={24}
                                                            />
                                                        ) : (
                                                            playerRank
                                                        )}
                                                    </div>
                                                    <div className="rank-info">
                                                        <div className="rank-name">
                                                            {player.nickname}
                                                        </div>
                                                        <div className="rank-score">
                                                            점수: {player.score}
                                                        </div>
                                                    </div>
                                                    {isFinalView &&
                                                        playerRank <= 3 && (
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
                                            );
                                        })}

                                    {/* 확장 가능한 중간 순위 */}
                                    {rankingData.length > 4 && (
                                        <>
                                            {expandedRankings &&
                                                rankingData
                                                    .slice(3, -1)
                                                    .map((player) => (
                                                        <div
                                                            key={
                                                                player.userId ||
                                                                player.rank
                                                            }
                                                            className="rank-item"
                                                        >
                                                            <div className="rank-number">
                                                                {player.rank}
                                                            </div>
                                                            <div className="rank-info">
                                                                <div className="rank-name">
                                                                    {
                                                                        player.nickname
                                                                    }
                                                                </div>
                                                                <div className="rank-score">
                                                                    점수:{" "}
                                                                    {
                                                                        player.score
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                            {rankingData.length > 4 && (
                                                <button
                                                    onClick={() =>
                                                        setExpandedRankings(
                                                            !expandedRankings
                                                        )
                                                    }
                                                    className="w-full p-2 text-center text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                                                >
                                                    {expandedRankings ? (
                                                        <>
                                                            <ChevronUp
                                                                size={16}
                                                                className="mr-1"
                                                            />
                                                            접기
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown
                                                                size={16}
                                                                className="mr-1"
                                                            />
                                                            {rankingData.length -
                                                                4}{" "}
                                                            명 더 보기
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* 항상 표시되는 꼴등 */}
                                    {rankingData.length > 3 &&
                                        !expandedRankings && (
                                            <div
                                                key={
                                                    rankingData[
                                                        rankingData.length - 1
                                                    ].userId ||
                                                    rankingData.length
                                                }
                                                className="rank-item"
                                            >
                                                <div className="rank-number">
                                                    <Frown
                                                        className="text-red-500"
                                                        size={24}
                                                    />
                                                </div>
                                                <div className="rank-info">
                                                    <div className="rank-name">
                                                        {
                                                            rankingData[
                                                                rankingData.length -
                                                                    1
                                                            ].nickname
                                                        }
                                                    </div>
                                                    <div className="rank-score">
                                                        점수:{" "}
                                                        {
                                                            rankingData[
                                                                rankingData.length -
                                                                    1
                                                            ].score
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* 비디오 다시 보기 버튼 (비디오가 있고 최종 결과가 아닐 때만 표시) */}
                            {hasAnyVideo && activeVideo && !isFinalView && (
                                <button
                                    onClick={() => setVideoEnded(false)}
                                    className="video-button mt-4"
                                >
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
                    {/* 최종 결과가 아닐 때의 비디오 섹션 */}
                    {!isFinalView && (
                        <div
                            className={`flex flex-col ${
                                !hasAnyVideo || !currentVideoUrl
                                    ? "md:w-0"
                                    : "md:w-1/2"
                            }`}
                        >
                            {hasAnyVideo && currentVideoUrl && (
                                <>
                                    <div className="video-wrapper mb-4">
                                        <video
                                            ref={videoRef}
                                            src={currentVideoUrl}
                                            className="w-full h-full object-cover"
                                            controls
                                            onEnded={handleVideoEnded}
                                        />
                                        <div className="video-badge">
                                            {activeVideo === "first"
                                                ? "🏆 우승자 플레이"
                                                : "😅 꼴등 플레이"}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mb-6">
                                        <button
                                            onClick={() =>
                                                setActiveVideo("first")
                                            }
                                            disabled={!firstVideoUrl}
                                            className={`video-toggle-button ${
                                                activeVideo === "first"
                                                    ? "video-toggle-active"
                                                    : "video-toggle-inactive"
                                            } ${
                                                !firstVideoUrl
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : ""
                                            }`}
                                        >
                                            <Trophy size={18} />
                                            <span>1등 영상</span>
                                        </button>
                                        <button
                                            onClick={() =>
                                                setActiveVideo("last")
                                            }
                                            disabled={!lastVideoUrl}
                                            className={`video-toggle-button ${
                                                activeVideo === "last"
                                                    ? "video-toggle-active"
                                                    : "video-toggle-inactive"
                                            } ${
                                                !lastVideoUrl
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : ""
                                            }`}
                                        >
                                            <Frown size={18} />
                                            <span>꼴등 영상</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* 최종 결과일 때의 포디움 섹션 */}
                    {isFinalView && (
                        <div className="grid grid-cols-1 gap-6">
                            {/* 상위 3명 포디움 */}
                            <div className={`podium-layout podium-desktop`}>
                                {/* 2등 */}
                                {topThreePlayers.length > 1 && (
                                    <div
                                        className={`podium-position podium-second podium-second-desktop`}
                                    >
                                        <div className="podium-avatar podium-avatar-second">
                                            <div className="podium-avatar-text podium-avatar-text-second">
                                                {topThreePlayers[1].nickname.charAt(
                                                    0
                                                )}
                                            </div>
                                        </div>
                                        <div className="podium-info">
                                            <Medal
                                                className="podium-icon-second"
                                                size={28}
                                            />
                                            <div className="podium-name podium-name-first">
                                                {topThreePlayers[1].nickname}
                                            </div>
                                            <div>
                                                {topThreePlayers[1].score}점
                                            </div>
                                        </div>
                                        <div className="podium-base podium-base-second podium-base-second-desktop"></div>
                                    </div>
                                )}

                                {/* 1등 */}
                                {topThreePlayers.length > 0 && (
                                    <div
                                        className={`podium-position podium-first podium-first-desktop`}
                                    >
                                        <div className="podium-avatar podium-avatar-first podium-avatar-first-desktop">
                                            <div className="podium-avatar-text podium-avatar-text-first">
                                                {topThreePlayers[0].nickname.charAt(
                                                    0
                                                )}
                                            </div>
                                        </div>
                                        <div className="podium-info">
                                            <Crown
                                                className="podium-icon-first"
                                                size={32}
                                            />
                                            <div className="podium-name podium-name-first">
                                                {topThreePlayers[0].nickname}
                                            </div>
                                            <div className="text-lg">
                                                {topThreePlayers[0].score}점
                                            </div>
                                        </div>
                                        <div className="podium-base podium-base-first podium-base-first-desktop"></div>
                                    </div>
                                )}

                                {/* 3등 */}
                                {topThreePlayers.length > 2 && (
                                    <div
                                        className={`podium-position podium-third podium-third-desktop`}
                                    >
                                        <div className="podium-avatar podium-avatar-third">
                                            <div className="podium-avatar-text podium-avatar-text-third">
                                                {topThreePlayers[2].nickname.charAt(
                                                    0
                                                )}
                                            </div>
                                        </div>
                                        <div className="podium-info">
                                            <Medal
                                                className="podium-icon-third"
                                                size={28}
                                            />
                                            <div className="podium-name podium-name-first">
                                                {topThreePlayers[2].nickname}
                                            </div>
                                            <div>
                                                {topThreePlayers[2].score}점
                                            </div>
                                        </div>
                                        <div className="podium-base podium-base-third podium-base-third-desktop"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 순위표 섹션 */}
                    <div
                        className={`${
                            !isFinalView && (!hasAnyVideo || !currentVideoUrl)
                                ? "md:w-full max-w-md mx-auto"
                                : isFinalView
                                ? "md:w-full"
                                : "md:w-1/2"
                        }`}
                    >
                        <div className="rankings-table">
                            <div className="rankings-header text-center">
                                {isFinalView ? "전체 순위표" : "순위표"}
                            </div>

                            <div className="rankings-body">
                                {/* 항상 표시되는 상위 3명 */}
                                {rankingData
                                    .slice(0, Math.min(3, rankingData.length))
                                    .map((player) => {
                                        let rankItemClass = "rank-item";
                                        const playerRank = player.rank || 0;

                                        if (playerRank === 1)
                                            rankItemClass += " rank-item-first";
                                        else if (playerRank === 2)
                                            rankItemClass +=
                                                " rank-item-second";
                                        else if (playerRank === 3)
                                            rankItemClass += " rank-item-third";

                                        return (
                                            <div
                                                key={
                                                    player.userId || playerRank
                                                }
                                                className={rankItemClass}
                                            >
                                                <div className="rank-number">
                                                    {playerRank === 1 ? (
                                                        <Trophy
                                                            className="text-yellow-500 mx-auto"
                                                            size={24}
                                                        />
                                                    ) : playerRank === 2 ? (
                                                        <Medal
                                                            className="text-gray-400 mx-auto"
                                                            size={24}
                                                        />
                                                    ) : playerRank === 3 ? (
                                                        <Medal
                                                            className="text-amber-700 mx-auto"
                                                            size={24}
                                                        />
                                                    ) : (
                                                        playerRank
                                                    )}
                                                </div>
                                                <div className="rank-info">
                                                    <div className="rank-name">
                                                        {player.nickname}
                                                    </div>
                                                    <div className="rank-score">
                                                        점수: {player.score}
                                                    </div>
                                                </div>
                                                {isFinalView &&
                                                    playerRank <= 3 && (
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
                                        );
                                    })}

                                {/* 확장 가능한 중간 순위 */}
                                {rankingData.length > 4 && (
                                    <>
                                        {expandedRankings &&
                                            rankingData
                                                .slice(3, -1)
                                                .map((player) => (
                                                    <div
                                                        key={
                                                            player.userId ||
                                                            player.rank
                                                        }
                                                        className="rank-item"
                                                    >
                                                        <div className="rank-number">
                                                            {player.rank}
                                                        </div>
                                                        <div className="rank-info">
                                                            <div className="rank-name">
                                                                {
                                                                    player.nickname
                                                                }
                                                            </div>
                                                            <div className="rank-score">
                                                                {player.score}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                        {rankingData.length > 4 && (
                                            <button
                                                onClick={() =>
                                                    setExpandedRankings(
                                                        !expandedRankings
                                                    )
                                                }
                                                className="w-full p-2 text-center text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
                                            >
                                                {expandedRankings ? (
                                                    <>
                                                        <ChevronUp
                                                            size={16}
                                                            className="mr-1"
                                                        />
                                                        접기
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown
                                                            size={16}
                                                            className="mr-1"
                                                        />
                                                        {rankingData.length - 4}{" "}
                                                        명 더 보기
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* 항상 표시되는 꼴등 */}
                                {rankingData.length > 3 &&
                                    !expandedRankings && (
                                        <div
                                            key={
                                                rankingData[
                                                    rankingData.length - 1
                                                ].userId || rankingData.length
                                            }
                                            className="rank-item"
                                        >
                                            <div className="rank-number">
                                                <Frown
                                                    className="text-red-500"
                                                    size={24}
                                                />
                                            </div>
                                            <div className="rank-info">
                                                <div className="rank-name">
                                                    {
                                                        rankingData[
                                                            rankingData.length -
                                                                1
                                                        ].nickname
                                                    }
                                                </div>
                                                <div className="rank-score">
                                                    점수:{" "}
                                                    {
                                                        rankingData[
                                                            rankingData.length -
                                                                1
                                                        ].score
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 버튼 영역 */}
            <div className="continue-button">
                {/* 일반 라운드 결과에서의 버튼 */}
                {!isFinalView && onContinue && (
                    <button
                        onClick={onContinue}
                        className="btn btn-primary inline-flex items-center"
                    >
                        <Play size={20} className="mr-2" />
                        {isFinalRound ? "최종 결과 확인하기" : "다음 게임으로"}
                    </button>
                )}

                {/* 최종 결과에서의 버튼 */}
                {isFinalView && (
                    <div className="flex flex-col items-center space-y-4">
                        {goLobby && (
                            <button
                                onClick={goLobby}
                                className="btn btn-secondary inline-flex items-center px-4 py-2"
                            >
                                🔙 선택 화면으로 돌아가기
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
