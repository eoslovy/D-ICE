interface AdminSendMessage {
    type: "ADMIN_JOIN" | "INIT" | "START_GAME" | "RECONNECT_ADMIN";
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

interface ReconnectAdminMessage extends AdminSendMessage {
    type: "RECONNECT_ADMIN",
}