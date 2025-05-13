package com.gamekjh.dto;

import java.util.ArrayList;
import java.util.concurrent.ConcurrentSkipListSet;

import lombok.Builder;
import lombok.extern.slf4j.Slf4j;

@Builder
@Slf4j
public class GraphHigh implements GameInfo {

	@Builder.Default
	ConcurrentSkipListSet<GraphHighClientMessage> gameMap = new ConcurrentSkipListSet<>();

	@Override
	public void init() {
		GraphHighClientMessage message1 = GraphHighClientMessage.builder()
			.userName("없음")
			.userCode("0")
			.earnedScore(0)
			.totalScore(0)
			.build();
		gameMap.add(message1);
		GraphHighClientMessage message2 = GraphHighClientMessage.builder()
			.userName("없음")
			.userCode("0")
			.earnedScore(0)
			.totalScore(0)
			.build();
		gameMap.add(message2);
		GraphHighClientMessage message3 = GraphHighClientMessage.builder()
			.userName("없음")
			.userCode("0")
			.earnedScore(0)
			.totalScore(0)
			.build();
		gameMap.add(message3);
	}

	public Boolean updateRanking(GraphHighClientMessage message){
		Boolean updated = gameMap.descendingSet().stream().limit(3).anyMatch(entry->{
			return entry.getEarnedScore() < message.getEarnedScore();
		});
		if(updated){
			//gameMap.remove(gameMap.last());
			gameMap.add(message);
		}
		return updated;
	}

	public GraphHighServerMessage getRankingTop3() {
		log.info("ranking map toString:" + gameMap.toString());
		GraphHighServerMessage message = GraphHighServerMessage.builder().scoreRanking(new ArrayList<>()).build();
		gameMap.descendingSet().stream().limit(3).forEach(entry->{
			message.getScoreRanking().add(entry);
		});
		return message;
	}
}