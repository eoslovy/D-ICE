package com.gameydg.numberSurvivor.service;

import java.io.IOException;

import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;

public interface NumberSurvivorService {
    /**
     * 게임 참가 처리
     * @param session 웹소켓 세션
     * @param joinDto 참가 정보
     * @throws IOException 메시지 전송 실패 시
     */
    void handleJoin(WebSocketSession session, NumberSurvivorJoinDto joinDto) throws IOException;

    /**
     * 게임 시작 처리
     * @param roomId 방 아이디
     * @throws IOException 메시지 전송 실패 시
     */
    void handleStart(String roomId) throws IOException;

    /**
     * 숫자 선택 처리
     * @param session 웹소켓 세션
     * @param selectDto 선택 정보
     * @throws IOException 메시지 전송 실패 시
     */
    void handleSelect(WebSocketSession session, NumberSurvivorSelectDto selectDto) throws IOException;

    /**
     * 현재 플레이어 수 가져오기
     * @param roomId 방 아이디
     * @return 현재 플레이어 수
     */
    int getCurrentPlayerCount(String roomId);

    /**
     * 최대 숫자 가져오기
     * @param roomId 방 아이디
     * @return 최대 숫자
     */
    int getMaxNumber(String roomId);
    
    /**
     * 연결 종료 처리
     * @param sessionId 종료된 세션 ID
     */
    void handleDisconnect(String sessionId);
}
