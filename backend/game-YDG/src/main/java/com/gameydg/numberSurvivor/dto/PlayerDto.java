package com.gameydg.numberSurvivor.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PlayerDto {
    private final String userId;
    private final String nickname;
    private Integer selectedNumber;
    private boolean alive;
} 