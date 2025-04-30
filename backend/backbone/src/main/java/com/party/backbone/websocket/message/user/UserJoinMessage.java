package com.party.backbone.websocket.message.user;

import com.party.backbone.websocket.message.GameMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserJoinMessage implements GameMessage {
	private String requestId;
	private String nickname;
}
