package com.gameydg.numberSurvivor.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class RoundResultDto {
    private final String type = "ROUND_RESULT";
    private final int round;
    private final Map<Integer, List<PlayerDto>> numberSelections;
    private final List<PlayerDto> survivors;
    private final List<PlayerDto> eliminated;
} 