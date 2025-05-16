interface SendMessage {
    requestId?: string;
}

interface UserSendMessage extends SendMessage {
    type:
        | "USER_JOIN"
        | "SUBMIT"
        | "USER_RECONNECT"
        | "BROADCAST_REQUEST"
        | "CHECK_ENDED";
}

interface CheckEenedMessage extends UserSendMessage {
    type: "CHECK_ENDED";
    userId: string;
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

interface AdminSendMessage extends SendMessage{
    type: "ADMIN_JOIN" | "INIT" | "START_GAME" | "ADMIN_RECONNECT" | "NEXT_GAME_ACK";
    administratorId: string;
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

interface NextGameAckMessage extends AdminSendMessage{
	type: "NEXT_GAME_ACK",
	currentRound: number,
}