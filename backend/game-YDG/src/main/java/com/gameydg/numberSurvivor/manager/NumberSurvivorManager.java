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
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Getter
public class NumberSurvivorManager {
	private final Map<String, Set<PlayerDto>> rooms = new ConcurrentHashMap<>();
	private final Map<String, Integer> currentRounds = new ConcurrentHashMap<>();
	private final Map<String, Map<Integer, List<PlayerDto>>> roundSelections = new ConcurrentHashMap<>();
	
	// 게임 시작 시간을 기록하는 맵 추가
	private final Map<String, Long> gameStartTimes = new ConcurrentHashMap<>();
	
	// 게임 제한 시간을 기록하는 맵 추가 (밀리초 단위)
	private final Map<String, Long> gameDurationLimits = new ConcurrentHashMap<>();
	
	// 게임 라운드 시작 시간을 기록하는 맵 추가
	private final Map<String, Long> roundStartTimes = new ConcurrentHashMap<>();
	
	// 기본 게임 제한 시간 (1분 = 60,000ms)
	private static final long DEFAULT_GAME_DURATION_LIMIT = 60000;

	// 게임 제한 시간 설정
	public void setGameDurationLimit(String roomId, long durationMs) {
		gameDurationLimits.put(roomId, durationMs);
	}
	
	public void joinRoom(String roomId, PlayerDto player) {
		rooms.computeIfAbsent(roomId, k -> new HashSet<>()).add(player);
		currentRounds.putIfAbsent(roomId, 1);
		roundSelections.putIfAbsent(roomId, new ConcurrentHashMap<>());
		gameDurationLimits.putIfAbsent(roomId, DEFAULT_GAME_DURATION_LIMIT);
		
		log.info("[게임 매니저] 플레이어 입장 [방ID: {}, 사용자ID: {}, 닉네임: {}]", 
				roomId, player.getUserId(), player.getNickname());
	}

	public void startGame(String roomId) {
		if (!rooms.containsKey(roomId)) {
			rooms.putIfAbsent(roomId, new HashSet<>());
		}
		
		if (!currentRounds.containsKey(roomId)) {
			currentRounds.put(roomId, 1);
		}
		
		if (!roundSelections.containsKey(roomId)) {
			roundSelections.put(roomId, new ConcurrentHashMap<>());
		} else {
			roundSelections.get(roomId).clear();
		}
		
		long startTime = System.currentTimeMillis();
		gameStartTimes.put(roomId, startTime);
		
		log.info("[게임 매니저] 게임 시작 [방ID: {}, 플레이어: {}명, 제한시간: {}ms]", 
				roomId, rooms.get(roomId).size(), gameDurationLimits.getOrDefault(roomId, DEFAULT_GAME_DURATION_LIMIT));
		
		if (rooms.containsKey(roomId)) {
			rooms.get(roomId).forEach(player -> {
				player.setAlive(true);
				player.setSelectedNumber(null);
			});
		}
	}
	
	// 라운드 시작 시간 기록
	public void setRoundStartTime(String roomId) {
		long startTime = System.currentTimeMillis();
		roundStartTimes.put(roomId, startTime);
		
		log.info("[게임 매니저] 라운드 시작 [방ID: {}, 라운드: {}]", 
				roomId, currentRounds.get(roomId));
	}
	
	// 게임 남은 시간 계산 (밀리초)
	public long getRemainingGameTime(String roomId) {
		long startTime = gameStartTimes.getOrDefault(roomId, 0L);
		long duration = gameDurationLimits.getOrDefault(roomId, DEFAULT_GAME_DURATION_LIMIT);
		long currentTime = System.currentTimeMillis();
		return Math.max(0, startTime + duration - currentTime);
	}
	
	// 현재 라운드 경과 시간 (밀리초)
	public long getCurrentRoundElapsedTime(String roomId) {
		long roundStart = roundStartTimes.getOrDefault(roomId, 0L);
		if (roundStart == 0) {
			return 0;
		}
		return System.currentTimeMillis() - roundStart;
	}
	
	// 방에서 플레이어 나가기
	public boolean leaveRoom(String roomId, String userId) {
		if (!rooms.containsKey(roomId)) {
			log.warn("[게임 매니저] 방 퇴장 실패 - 존재하지 않는 방 [방ID: {}, 사용자ID: {}]", roomId, userId);
			return false;
		}
		
		PlayerDto playerToRemove = findPlayer(roomId, userId);
		if (playerToRemove == null) {
			log.warn("[게임 매니저] 방 퇴장 실패 - 존재하지 않는 플레이어 [방ID: {}, 사용자ID: {}]", roomId, userId);
			return false;
		}
		
		boolean removed = rooms.get(roomId).remove(playerToRemove);
		
		if (removed && roundSelections.containsKey(roomId)) {
			roundSelections.get(roomId).values().forEach(players -> 
				players.removeIf(p -> p.getUserId().equals(userId))
			);
		}
		
		log.info("[게임 매니저] 플레이어 퇴장 [방ID: {}, 사용자ID: {}, 닉네임: {}]", 
				roomId, userId, playerToRemove.getNickname());
		return removed;
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

		selections.forEach((number, players) -> {
			if (players.size() == 1) {
				PlayerDto survivor = players.get(0);
				survivor.setAlive(true);
				survivors.add(survivor);
			} else {
				players.forEach(player -> {
					player.setAlive(false);
					eliminated.add(player);
				});
			}
		});

		currentRounds.put(roomId, currentRounds.get(roomId) + 1);
		roundSelections.get(roomId).clear();

		log.info("[게임 매니저] 라운드 결과 [방ID: {}, 라운드: {}, 생존자: {}명, 탈락자: {}명]", 
				roomId, currentRounds.get(roomId) - 1, survivors.size(), eliminated.size());

		return RoundResultDto.builder()
				.round(currentRounds.get(roomId) - 1)
				.numberSelections(selections)
				.survivors(survivors)
				.eliminated(eliminated)
				.build();
	}

	public boolean isGameOver(String roomId) {
		long aliveCount = rooms.get(roomId).stream()
				.filter(PlayerDto::isAlive)
				.count();
				
		if (aliveCount <= 2) {
			log.info("[게임 매니저] 게임 종료 조건 충족 [방ID: {}, 생존자: {}명]", roomId, aliveCount);
			return true;
		}
		return false;
	}

	public boolean isAllDead(String roomId) {
		boolean allDead = rooms.get(roomId).stream().noneMatch(PlayerDto::isAlive);
		if (allDead) {
			log.info("[게임 매니저] 전원 탈락 [방ID: {}]", roomId);
		}
		return allDead;
	}

	public List<PlayerDto> getWinners(String roomId) {
		List<PlayerDto> winners = rooms.get(roomId).stream()
				.filter(PlayerDto::isAlive)
				.toList();
				
		log.info("[게임 매니저] 우승자 결정 [방ID: {}, 우승자: {}명]", 
				roomId, winners.size());
				
		return winners;
	}

	// 사용자 ID로 플레이어 찾기
	public PlayerDto findPlayer(String roomId, String userId) {
		return rooms.get(roomId).stream()
				.filter(p -> p.getUserId().equals(userId))
				.findFirst()
				.orElse(null);
	}

	// 현재 방의 플레이어 수를 반환합니다.
	public int getCurrentPlayerCount(String roomId) {
		if (!rooms.containsKey(roomId)) {
			return 0;
		}
		return rooms.get(roomId).size();
	}
}
