package com.gameydg.numberSurvivor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NumberSurvivorSelectDto {
    private String type;
    private String userId;
    private String roomId;
    private int selectedNumber;
}
