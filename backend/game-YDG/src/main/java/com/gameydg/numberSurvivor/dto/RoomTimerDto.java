package com.gameydg.numberSurvivor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTimerDto {
    private GameState state;
    private int remainingTime;

    public void decreaseTime() {
        this.remainingTime--;
    }
} 