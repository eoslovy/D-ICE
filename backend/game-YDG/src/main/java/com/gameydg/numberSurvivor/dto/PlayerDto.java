package com.gameydg.numberSurvivor.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.util.Objects;

@Getter
@Setter
@Builder
public class PlayerDto {
    private final String userId;
    private final String nickname;
    private Integer selectedNumber;
    private boolean alive;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlayerDto playerDto = (PlayerDto) o;
        return Objects.equals(userId, playerDto.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }
}