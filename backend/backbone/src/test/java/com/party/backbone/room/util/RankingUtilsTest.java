package com.party.backbone.room.util;

import static com.party.backbone.room.util.RankingUtils.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.junit.jupiter.api.Test;

import com.party.backbone.websocket.model.RankingInfo;

class RankingUtilsTest {

	@Test
	void testGetSortedScoreEntries_descendingOrder() {
		Map<String, Number> scores = Map.of("A", 30, "B", 50, "C", 10);
		List<Entry<String, ? extends Number>> sorted = getSortedScoreEntries(scores);

		assertEquals("B", sorted.get(0).getKey());
		assertEquals("A", sorted.get(1).getKey());
		assertEquals("C", sorted.get(2).getKey());
	}

	@Test
	void testCalculateRanks_withTies() {
		List<Entry<String, ? extends Number>> sorted = getSortedScoreEntries(Map.of(
			"A", 100,
			"B", 200,
			"C", 200,
			"D", 50
		));

		Map<String, Integer> ranks = calculateRanks(sorted);

		assertEquals(1, ranks.get("B"));
		assertEquals(1, ranks.get("C"));
		assertEquals(3, ranks.get("A"));
		assertEquals(4, ranks.get("D"));
	}

	@Test
	void testBuildTopK_correctRankingInfos() {
		Map<String, Number> scores = Map.of("A", 100, "B", 200, "C", 150);
		Map<String, String> nickMap = Map.of("A", "Alice", "B", "Bob", "C", "Carol");
		List<Entry<String, ? extends Number>> sorted = getSortedScoreEntries(scores);
		Map<String, Integer> ranks = calculateRanks(sorted);

		List<RankingInfo> top2 = buildTopK(sorted, ranks, nickMap, 2);
		List<RankingInfo> allRanking = buildAllRanking(sorted, ranks, nickMap);

		assertEquals(2, top2.size());
		assertEquals("B", top2.get(0).userId());
		assertEquals("C", top2.get(1).userId());

		assertEquals("A", allRanking.get(2).userId());
	}

	@Test
	void testGetFirstByRank_returnsLowestRankedUser() {
		Map<String, Integer> ranks = Map.of("A", 2, "B", 1, "C", 3);
		assertEquals("B", getFirstByRank(ranks));
	}

	@Test
	void testGetLastByRank_returnsHighestRankedUser() {
		Map<String, Integer> ranks = Map.of("A", 2, "B", 1, "C", 3);
		assertEquals("C", getLastByRank(ranks));
	}
}
