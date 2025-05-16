package com.gamekjh.dto;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.web.socket.WebSocketSession;

import com.gamekjh.model.GameType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GameSession {

	ConcurrentMap<String, WebSocketSession> gameSession;

	GameInfo gameInfo;

	public static GameSession creatGameSession(GameType gameType){
		return GameSession.builder()
			.gameSession(new ConcurrentHashMap<>())
			.gameInfo(gameType.getGameInfo())
			.build();
	}

	public void joinSession(String userId, WebSocketSession session){
		this.gameSession.put(userId, session);
	}
}
