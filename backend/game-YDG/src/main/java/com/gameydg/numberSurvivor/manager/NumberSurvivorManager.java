package com.gameydg.numberSurvivor.manager;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashMap;

import org.springframework.stereotype.Component;

import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.dto.RoundResultDto;

import lombok.Getter;

@Component
@Getter
public class NumberSurvivorManager {
	private final Map<String, Set<PlayerDto>> rooms = new ConcurrentHashMap<>();
	private final Map<String, Integer> currentRounds = new ConcurrentHashMap<>();
	private final Map<String, Map<Integer, List<PlayerDto>>> roundSelections = new ConcurrentHashMap<>();

	public void joinRoom(String roomId, PlayerDto player) {
		rooms.computeIfAbsent(roomId, k -> new HashSet<>()).add(player);
		currentRounds.putIfAbsent(roomId, 1);
		roundSelections.putIfAbsent(roomId, new ConcurrentHashMap<>());
	}

	public void startGame(String roomId) {
		// 선택 기록 초기화
		roundSelections.get(roomId).clear();
		
		// 모든 플레이어 초기 상태 설정
		rooms.get(roomId).forEach(player -> {
			player.setAlive(true);
			player.setSelectedNumber(null);
		});
	}

	public void selectNumber(String roomId, String userId, int number) {
		PlayerDto player = findPlayer(roomId, userId);
		if (player != null && player.isAlive()) {
			player.setSelectedNumber(number);
			roundSelections.get(roomId)
					.computeIfAbsent(number, k -> new ArrayList<>())
					.add(player);
		}
	}

	public RoundResultDto processRound(String roomId) {
		Map<Integer, List<PlayerDto>> selections = new HashMap<>(roundSelections.get(roomId));
		List<PlayerDto> survivors = new ArrayList<>();
		List<PlayerDto> eliminated = new ArrayList<>();

		// 각 숫자별로 처리
		selections.forEach((number, players) -> {
			if (players.size() == 1) {
				// 단독 선택한 플레이어는 생존
				PlayerDto survivor = players.get(0);
				survivor.setAlive(true);
				survivors.add(survivor);
			} else {
				// 중복 선택한 플레이어들은 탈락
				players.forEach(player -> {
					player.setAlive(false);
					eliminated.add(player);
				});
			}
		});

		// 다음 라운드 준비
		currentRounds.put(roomId, currentRounds.get(roomId) + 1);
		roundSelections.get(roomId).clear();

		return RoundResultDto.builder()
				.round(currentRounds.get(roomId) - 1)
				.numberSelections(selections)
				.survivors(survivors)
				.eliminated(eliminated)
				.build();
	}

	public boolean isGameOver(String roomId) {
		return rooms.get(roomId).stream()
				.filter(PlayerDto::isAlive)
				.count() <= 2;
	}

	public boolean isAllDead(String roomId) {
		return rooms.get(roomId).stream().noneMatch(PlayerDto::isAlive);
	}

	public List<PlayerDto> getWinners(String roomId) {
		return rooms.get(roomId).stream()
				.filter(PlayerDto::isAlive)
				.toList();
	}

	private PlayerDto findPlayer(String roomId, String userId) {
		return rooms.get(roomId).stream()
				.filter(p -> p.getUserId().equals(userId))
				.findFirst()
				.orElse(null);
	}
}
