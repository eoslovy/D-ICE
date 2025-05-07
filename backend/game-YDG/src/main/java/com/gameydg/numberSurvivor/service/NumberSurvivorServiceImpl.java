package com.gameydg.numberSurvivor.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;
import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.dto.RoundResultDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NumberSurvivorServiceImpl implements NumberSurvivorService {
    private final NumberSurvivorManager gameManager;
    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Boolean> gameStarted = new ConcurrentHashMap<>();
    
    @Override
    public void handleJoin(WebSocketSession session, NumberSurvivorJoinDto joinDto) {
        sessions.put(joinDto.getUserId(), session);
        
        PlayerDto player = PlayerDto.builder()
                .userId(joinDto.getUserId())
                .nickname(joinDto.getNickname())
                .alive(true)
                .build();
        
        gameManager.joinRoom(joinDto.getRoomId(), player);
        gameStarted.putIfAbsent(joinDto.getRoomId(), false);
    }

    @Override
    public void handleStart(String roomId) throws IOException {
        if (!gameStarted.get(roomId)) {
            gameStarted.put(roomId, true);
            // 게임 상태 초기화
            gameManager.startGame(roomId);
            // 게임 시작 메시지 전송
            broadcastMessage(roomId, createGameStartMessage(roomId));
        }
    }
    
    @Override
    public void handleSelect(WebSocketSession session, NumberSurvivorSelectDto selectDto) throws IOException {
        PlayerDto player = gameManager.getRooms().get(selectDto.getRoomId()).stream()
            .filter(p -> p.getUserId().equals(selectDto.getUserId()))
            .findFirst()
            .orElse(null);

        if (player == null || !player.isAlive()) {
            // 탈락자는 무시
            return;
        }

        if (!gameStarted.get(selectDto.getRoomId())) {
            return;
        }

        gameManager.selectNumber(selectDto.getRoomId(), selectDto.getUserId(), selectDto.getSelectedNumber());
        
        // 모든 플레이어가 선택했는지 확인
        if (isAllPlayersSelected(selectDto.getRoomId())) {
            RoundResultDto result = gameManager.processRound(selectDto.getRoomId());
            broadcastMessage(selectDto.getRoomId(), result);
            
            // 전원 탈락 시 라운드 재시작
            if (gameManager.isAllDead(selectDto.getRoomId())) {
                gameManager.getRooms().get(selectDto.getRoomId()).forEach(p -> {
                    p.setAlive(true);
                    p.setSelectedNumber(null);
                });
                broadcastMessage(selectDto.getRoomId(), createGameStartMessage(selectDto.getRoomId()));
                return;
            }

            if (gameManager.isGameOver(selectDto.getRoomId())) {
                // 게임 종료 처리
                sendGameOverMessage(selectDto.getRoomId());
                gameStarted.put(selectDto.getRoomId(), false);
            } else {
                // 다음 라운드 시작 전 플레이어 상태 초기화
                resetPlayersForNewRound(selectDto.getRoomId());
                // 다음 라운드 시작
                broadcastMessage(selectDto.getRoomId(), createGameStartMessage(selectDto.getRoomId()));
            }
        }
    }

    private void resetPlayersForNewRound(String roomId) {
        gameManager.getRooms().get(roomId).forEach(player -> {
            if (player.isAlive()) {
                player.setSelectedNumber(null);
            }
        });
    }

    @Override
    public int getCurrentPlayerCount(String roomId) {
        return gameManager.getRooms().get(roomId).size();
    }

    @Override
    public int getMaxNumber(String roomId) {
        return (int) Math.ceil(gameManager.getRooms().get(roomId).size() * 0.7);
    }
    
    private boolean isAllPlayersSelected(String roomId) {
        return gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .allMatch(player -> player.getSelectedNumber() != null);
    }
    
    private void broadcastMessage(String roomId, Object message) throws IOException {
        String messageStr = objectMapper.writeValueAsString(message);
        gameManager.getRooms().get(roomId).forEach(player -> {
            try {
                WebSocketSession session = sessions.get(player.getUserId());
                if (session != null) {
                    session.sendMessage(new TextMessage(messageStr));
                }
            } catch (IOException e) {
                log.error("Error broadcasting message", e);
            }
        });
    }
    
    private Map<String, Object> createGameStartMessage(String roomId) {
        return Map.of(
            "type", "ROUND_START",
            "round", gameManager.getCurrentRounds().get(roomId),
            "timeLimit", 10,
            "maxNumber", getMaxNumber(roomId)
        );
    }
    
    private void sendGameOverMessage(String roomId) throws IOException {
        List<PlayerDto> winners = gameManager.getWinners(roomId);
        broadcastMessage(roomId, Map.of(
            "type", "GAME_OVER",
            "winners", winners
        ));
    }
}