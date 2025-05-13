package com.gamekjh.service;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamekjh.dto.GameSession;
import com.gamekjh.dto.GraphHigh;
import com.gamekjh.dto.GraphHighClientMessage;
import com.gamekjh.dto.GraphHighServerMessage;
import com.gamekjh.utils.GameServerUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GraphHighServiceImpl implements GraphHighService {

	private final GameServerUtil gameServerUtil;
	private final ObjectMapper mapper;
	@Override
	public void updateScoreAndSendMessage(WebSocketSession session, String roomCode, GraphHighClientMessage message) throws
		JsonProcessingException {
		GameSession gameSession = gameServerUtil.getGameSession(roomCode);
		if(gameSession.getGameInfo() instanceof GraphHigh){
			GraphHigh graphHigh = (GraphHigh)gameSession.getGameInfo();
			if(!graphHigh.updateRanking(message)) return;

			GraphHighServerMessage graphHighServerMessage = graphHigh.getRankingTop3();
			TextMessage payload =new TextMessage(mapper.writeValueAsString(graphHighServerMessage));
			gameSession.getGameSession().forEach((key, value) -> {
				try {
					value.sendMessage(payload);
				} catch (IOException ex) {
					throw new RuntimeException(ex);
				}
			});
		}
	}
}
