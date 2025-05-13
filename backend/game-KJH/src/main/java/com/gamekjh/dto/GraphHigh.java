package com.gamekjh.dto;

import java.util.concurrent.ConcurrentSkipListSet;

import lombok.Builder;

@Builder
public class GraphHigh implements GameInfo {

	@Builder.Default
	ConcurrentSkipListSet<GraphHighClientMessage> gameMap = new ConcurrentSkipListSet<>();

	@Override
	public void init() {
		GraphHighClientMessage message = GraphHighClientMessage.builder()
			.userName("없음")
			.userCode("0")
			.earnedScore(0)
			.totalScore(0)
			.build();
		gameMap.add(message);
		gameMap.add(message);
		gameMap.add(message);
	}

	public Boolean updateRanking(GraphHighClientMessage message){
		Boolean updated = gameMap.descendingSet().stream().limit(3).anyMatch(entry->{
			return entry.getEarnedScore() < message.getEarnedScore();
		});
		if(updated){
			gameMap.remove(gameMap.last());
			gameMap.add(message);
		}
		return updated;
	}

	public GraphHighServerMessage getRankingTop3() {
		GraphHighServerMessage message = new GraphHighServerMessage();
		gameMap.descendingSet().stream().limit(3).forEach(entry->{
			message.getScoreRanking().add(entry);
		});
		return message;
	}
}