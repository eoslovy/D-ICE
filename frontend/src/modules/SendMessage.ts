interface SendMessage {
    requestId: string;
}

interface UserSendMessage extends SendMessage {
    type: "USER_JOIN" | "SUBMIT" | "USER_RECONNECT" | "BROADCAST_REQUEST";
}

interface UserJoinMessage extends UserSendMessage {
    type: "USER_JOIN";
    nickname: string;
}

interface SubmitMessage extends UserSendMessage {
    type: "SUBMIT";
    userId: string;
    score: number;
    // TODO: gameType enum 필요
    gameType: string;
}

interface UserReconnectMessage extends UserSendMessage {
    type: "USER_RECONNECT";
    userId: string;
}

interface BroadcastRequestMessage extends UserSendMessage {
    type: "BROADCAST_REQUEST";
    userId: string;
    payload: string;
}

interface AdminSendMessage {
    type: "ADMIN_JOIN" | "INIT" | "START_GAME" | "ADMIN_RECONNECT";
    administratorId: string;
    requestId: string;
}

interface AdminJoinMessage extends AdminSendMessage {
    type: "ADMIN_JOIN";
}

interface InitMessage extends AdminSendMessage {
    type: "INIT";
    totalRound: number;
}

interface StartGameMessage extends AdminSendMessage {
    type: "START_GAME";
}

interface AdminReconnectMessage extends AdminSendMessage {
    type: "ADMIN_RECONNECT",
}
