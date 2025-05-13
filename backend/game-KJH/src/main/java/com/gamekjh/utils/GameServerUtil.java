package com.gamekjh.utils;

import java.io.IOException;
import java.util.HashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import com.gamekjh.dto.GameSession;
import com.gamekjh.model.GameType;
import com.gamekjh.repository.RedisRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class GameServerUtil {

	HashMap<String, GameSession> gameSessionMap;
	RedisRepository redisRepository;

	public void joinGameConnection(GameType gameType, String roomCode, String roundCode, String userCode, WebSocketSession session) {
		gameSessionMap.computeIfAbsent(roomCode, (id) -> {
			if(!redisRepository.roomExistsAndGameTypeMatches(roomCode)) throw new RuntimeException("Room does not exist or GameType does not match");
			gameSessionMap.putIfAbsent(roomCode, GameSession.creatGameSession(gameType));
			gameSessionMap.get(roomCode).joinSession(userCode, session);
			return gameSessionMap.get(roomCode);
		});
	}

	public GameSession getGameSession(String roomCode) {
		return gameSessionMap.get(roomCode);
	}

	@Scheduled(initialDelay = 5000, fixedDelay = 5000)
	public void checkHealthCheck(){
		gameSessionMap.forEach((roomCode, gameSession) -> {
			gameSession.getGameSession().entrySet().stream()
				.filter(entry -> !entry.getValue().isOpen())
				.forEach(entry -> {
					WebSocketSession session = entry.getValue();
					try {
						session.close();
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
					entry.setValue(null);
				});
		});
	}

	@Scheduled(initialDelay = 5000, fixedDelay = 5000)
	public void checkGameStatusCheck(GameType gameType){
		//Todo 연결된 사람이 없거나, 게임상태가 종료되었을때

	}

	public void closeGameSession(GameType gameType, String roomCode, String roundCode, String userCode, WebSocketSession session) {
		//Todo 게임 세션을 강제로 종료함
	}
}
