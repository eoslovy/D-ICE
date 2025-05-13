package com.gameydg.numberSurvivor.service;

import java.io.IOException;

import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;

public interface NumberSurvivorService {
	// 게임 참가 처리
	void handleJoin(WebSocketSession session, NumberSurvivorJoinDto joinDto) throws IOException;

	// 게임 시작 처리
	void handleStart(String roomCode) throws IOException;

	// 숫자 선택 처리
	void handleSelect(WebSocketSession session, NumberSurvivorSelectDto selectDto) throws IOException;

	// 연결 종료 처리
	void handleDisconnect(String sessionId);
}
