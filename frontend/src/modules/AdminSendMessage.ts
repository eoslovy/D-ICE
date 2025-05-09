// interface AdminSendMessage {
//     type: "ADMIN_JOIN" | "INIT" | "START_GAME" | "ADMIN_RECONNECT";
//     administratorId: string;
//     requestId: string;
// }

// interface AdminJoinMessage extends AdminSendMessage {
//     type: "ADMIN_JOIN";
// }

// interface InitMessage extends AdminSendMessage {
//     type: "INIT";
//     totalRound: number;
// }

// interface StartGameMessage extends AdminSendMessage {
//     type: "START_GAME";
// }

// interface AdminReconnectMessage extends AdminSendMessage {
//     type: "ADMIN_RECONNECT",
// }

// 이거 안쓰는 건가?