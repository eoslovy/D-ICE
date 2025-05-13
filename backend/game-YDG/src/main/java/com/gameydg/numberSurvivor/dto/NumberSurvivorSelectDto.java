package com.gameydg.numberSurvivor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NumberSurvivorSelectDto {
    private final String type = "NUMBER_SURVIVOR_SELECT";
    private String userId;
    private String roomId;
    private Integer selectedNumber;
}
