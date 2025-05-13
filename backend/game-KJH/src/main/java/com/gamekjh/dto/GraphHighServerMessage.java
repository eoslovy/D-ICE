package com.gamekjh.dto;

import java.util.List;

import lombok.Data;

@Data
public class GraphHighServerMessage {
	List<GraphHighClientMessage> scoreRanking;
}
