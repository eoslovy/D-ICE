package com.gameydg.numberSurvivor.handler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;
import com.gameydg.numberSurvivor.service.NumberSurvivorService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class NumberSurvivorWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper objectMapper;
    private final NumberSurvivorService numberSurvivorService;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("Received message: {}", payload);
        
        JsonNode jsonNode = objectMapper.readTree(payload);
        String type = jsonNode.get("type").asText();

        switch (type) {
            case "NUMBER_SURVIVOR_JOIN":
                NumberSurvivorJoinDto joinDto = objectMapper.treeToValue(jsonNode, NumberSurvivorJoinDto.class);
                numberSurvivorService.handleJoin(session, joinDto);
                // 대기 메시지 전송
                sendWaitingMessage(session, joinDto.getRoomId());
                break;
            case "NUMBER_SURVIVOR_START":
                String roomId = jsonNode.get("roomId").asText();
                numberSurvivorService.handleStart(roomId);
                break;
            case "NUMBER_SURVIVOR_SELECT":
                numberSurvivorService.handleSelect(session, objectMapper.treeToValue(jsonNode, NumberSurvivorSelectDto.class));
                break;
            default:
                log.warn("Unknown message type: {}", type);
        }
    }

    private void sendWaitingMessage(WebSocketSession session, String roomId) throws Exception {
        Map<String, Object> message = Map.of(
            "type", "WAITING",
            "message", "다른 플레이어를 기다리는 중...",
            "currentPlayers", numberSurvivorService.getCurrentPlayerCount(roomId)
        );
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        log.info("New connection established: {}", sessionId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        log.info("Connection closed: {}, status: {}", sessionId, status);
    }
}
