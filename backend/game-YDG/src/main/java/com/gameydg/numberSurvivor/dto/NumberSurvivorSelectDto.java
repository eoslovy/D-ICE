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
    private Integer selectedNumber;
    
    // 필요한 필드만으로 객체를 생성할 수 있는 생성자 추가
    public NumberSurvivorSelectDto(String roomId, String userId, Integer selectedNumber) {
        this.roomId = roomId;
        this.userId = userId;
        this.selectedNumber = selectedNumber;
    }
}
