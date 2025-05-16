package com.gamekjh.service;

import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.gamekjh.dto.GraphHighClientMessage;

public interface GraphHighService {
	void updateScoreAndSendMessage(WebSocketSession session, String roomCode, GraphHighClientMessage message) throws JsonProcessingException;
}
