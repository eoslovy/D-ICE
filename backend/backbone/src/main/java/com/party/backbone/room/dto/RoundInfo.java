package com.party.backbone.room.dto;

import com.party.backbone.websocket.model.GameType;

public record RoundInfo(GameType gameType, long startAt, long duration, long currentMs) {
}
