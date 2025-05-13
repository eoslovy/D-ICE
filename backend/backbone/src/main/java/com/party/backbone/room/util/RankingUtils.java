package com.party.backbone.room.util;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.stream.Collectors;

import com.party.backbone.websocket.model.RankingInfo;

public class RankingUtils {

	public static List<Entry<String, ? extends Number>> getSortedScoreEntries(Map<String, ? extends Number> scoreMap) {
		return scoreMap.entrySet().stream()
			.sorted((a, b) -> Double.compare(b.getValue().doubleValue(), a.getValue().doubleValue()))
			.collect(Collectors.toList());
	}

	public static Map<String, Integer> calculateRanks(List<Entry<String, ? extends Number>> sortedEntries) {
		Map<String, Integer> result = new HashMap<>();
		int rank = 1;
		int count = 0;
		double prevScore = Double.NaN;
		for (Entry<String, ? extends Number> entry : sortedEntries) {
			count++;
			double score = entry.getValue().doubleValue();
			if (Double.compare(score, prevScore) != 0) {
				rank = count;
				prevScore = score;
			}
			result.put(entry.getKey(), rank);
		}
		return result;
	}

	public static List<RankingInfo> buildAllRanking(List<Entry<String, ? extends Number>> sortedEntries,
		Map<String, Integer> rankMap,
		Map<String, String> nickMap) {
		return buildTopK(sortedEntries, rankMap, nickMap, sortedEntries.size());
	}

	public static List<RankingInfo> buildTopK(List<Entry<String, ? extends Number>> sortedEntries,
		Map<String, Integer> rankMap,
		Map<String, String> nickMap,
		int k) {
		if (k <= 0) {
			throw new IllegalArgumentException("k must be positive");
		}
		return sortedEntries.stream()
			.limit(k)
			.map(entry -> {
				String userId = entry.getKey();
				return new RankingInfo(
					userId,
					nickMap.get(userId),
					entry.getValue().intValue(),
					rankMap.get(userId)
				);
			})
			.collect(Collectors.toList());
	}

	public static String getFirstByRank(Map<String, Integer> ranks) {
		return ranks.entrySet().stream()
			.min(Comparator.comparingInt(Entry::getValue))
			.map(Entry::getKey)
			.orElse(null);
	}

	public static String getLastByRank(Map<String, Integer> ranks) {
		return ranks.entrySet().stream()
			.max(Comparator.comparingInt(Entry::getValue))
			.map(Entry::getKey)
			.orElse(null);
	}
}
