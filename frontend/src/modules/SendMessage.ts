interface SendMessage {
    requestId: string;
}

interface UserSendMessage extends SendMessage {
    type: "USER_JOIN" | "SUBMIT";
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

interface AdminSendMessage extends SendMessage {
    type: "ADMIN_JOIN" | "INIT" | "START_GAME";
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

