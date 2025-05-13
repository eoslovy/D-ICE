package com.gamekjh.dto;

import org.jetbrains.annotations.NotNull;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GraphHighClientMessage implements Comparable<GraphHighClientMessage>{
	private String userCode;
	private String userName;
	private Integer earnedScore;
	private Integer totalScore;

	@Override
	public int compareTo(@NotNull GraphHighClientMessage o) {
		return this.earnedScore - o.earnedScore;
	}
}
