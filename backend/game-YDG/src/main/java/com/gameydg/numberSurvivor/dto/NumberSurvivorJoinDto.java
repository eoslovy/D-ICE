package com.gameydg.numberSurvivor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NumberSurvivorJoinDto {
    private final String type = "NUMBER_SURVIVOR_JOIN";
    private String userId;
    private String roomId;
    private String nickname;
}