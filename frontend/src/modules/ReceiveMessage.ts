interface RankingInfo {
    rank: number;
    userId: string;
    nickname: string;
    score: number;
}

interface PotgInfo {
    userId: string;
    nickname: string;
    videoUrl: string;
}

interface AdminJoinedMessage {
    type: "ADMIN_JOINED";
    requestId: string;
}

interface AdminReconnectedMessage {
    type: "ADMIN_RECONNECTED";
    requestId: string;
}

interface UserJoinedMessage {
    type: "USER_JOINED";
    userId: string;
    nickname: string;
    requestId: string;
}
interface UserReconnectedMessage {
    type: "USER_RECONNECTED";
    requestId: string;
    userId: string;
}
interface EnterGameMessage {
    type: "ENTER_GAME";
}

interface UserJoinedAdminMessage {
    type: "USER_JOINED_ADMIN";
    userId: string;
    userCount: number;
    nickname: string;
    requestId: string;
}

interface NextGameMessage {
    type: "NEXT_GAME";
    // TODO: Game Type 별 enum으로 변경 필요
    gameType: string;
    currentRound: number;
}

interface WaitMessage {
    type: "WAIT";
    // TODO: Game Type 별 enum으로 변경 필요
    gameType: string;
    startAt: number;
    duration: number;
    currentMs: number;
}

interface AggregatedAdminMessage {
    type: "AGGREGATED_ADMIN";
    requestId: string; //UUIDv7
    currentRound: number; // 현재 round
    totalRound: number; // 전체 round
    gameType: string; //게임이름
    roundPlayerCount: number; // 이번 라운드 참여자 수
    totalPlayerCount: number; // 총 참여자 수
    roundRanking: RankingInfo[];
    overallRanking: RankingInfo[];
    firstPlace: PotgInfo;
    lastPlace: PotgInfo;
}

interface AggregatedUserMessage {
    type: "AGGREGATED_USER";
    requestId: string; //UUIDv7
    currentRound: number; // 현재 round
    totalRound: number; // 전체 round
    gameType: string; //게임이름
    currentScore: number; // int 이번 round 점수
    totalScore: number;
    rankRecord: string; // 구분자 | 라운드별 순위 기록
    roundRank: number;
    overallRank: number;
    roundPlayerCount: number; // 이번 라운드 참여자(SUBMIT) 수
    totalPlayerCount: number; // 총 참여자 수
    roundRanking: RankingInfo[];
    overallRanking: RankingInfo[];
    videoUploadUrl: string; // s3 presigned url POST|PUT용
}

interface EndMessage {
    type: "END";
    overallRanking: RankingInfo[];
}

interface BroadcastMessage {
    type: "BROADCAST";
    requestId: string; //UUIDv7
    userId: string;
    payload: string;
}

interface ErrorMessage {
    type: "ERROR";
    message: string;
}


type ReceiveMessage =
    | {
          [K in keyof AdminReceiveTypeMap]: {
              type: K;
          } & AdminReceiveTypeMap[K];
      }[keyof AdminReceiveTypeMap]
    | {
          [K in keyof UserReceiveTypeMap]: {
              type: K;
          } & UserReceiveTypeMap[K];
      }[keyof UserReceiveTypeMap];

type ReceiveMessageMap = AdminReceiveTypeMap | UserReceiveTypeMap;

type AdminReceiveTypeMap = {
    ADMIN_JOINED: AdminJoinedMessage;
    ADMIN_RECONNECTED: AdminReconnectedMessage;
    USER_JOINED_ADMIN: UserJoinedAdminMessage;
    NEXT_GAME: NextGameMessage;
    AGGREGATED_ADMIN: AggregatedAdminMessage;
    END: EndMessage;
    BROADCAST: BroadcastMessage;
};

type UserReceiveTypeMap = {
    USER_JOINED: UserJoinedMessage;
    USER_RECONNECTED: UserReconnectedMessage;
    WAIT: WaitMessage;
    ENTER_GAME: EnterGameMessage;
    AGGREGATED_USER: AggregatedUserMessage;
    BROADCAST: BroadcastMessage;
};
