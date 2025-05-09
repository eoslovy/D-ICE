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
		log.info("게임 제한 시간 설정 [방ID: {}, 제한 시간: {}ms]", roomId, durationMs);
	}
	
	public void joinRoom(String roomId, PlayerDto player) {
		rooms.computeIfAbsent(roomId, k -> new HashSet<>()).add(player);
		currentRounds.putIfAbsent(roomId, 1);
		roundSelections.putIfAbsent(roomId, new ConcurrentHashMap<>());
		
		// 기본 게임 제한 시간 설정 (아직 설정되지 않은 경우)
		gameDurationLimits.putIfAbsent(roomId, DEFAULT_GAME_DURATION_LIMIT);
	}

	public void startGame(String roomId) {
		// 방이 존재하지 않으면 초기화
		if (!rooms.containsKey(roomId)) {
			rooms.putIfAbsent(roomId, new HashSet<>());
		}
		
		if (!currentRounds.containsKey(roomId)) {
			currentRounds.put(roomId, 1);
		}
		
		if (!roundSelections.containsKey(roomId)) {
			roundSelections.put(roomId, new ConcurrentHashMap<>());
		} else {
			// 선택 기록 초기화
			roundSelections.get(roomId).clear();
		}
		
		// 게임 시작 시간 기록
		long startTime = System.currentTimeMillis();
		gameStartTimes.put(roomId, startTime);
		log.info("게임 시작 시간 기록 [방ID: {}, 시간: {}, 제한시간: {}ms]", 
		        roomId, startTime, gameDurationLimits.getOrDefault(roomId, DEFAULT_GAME_DURATION_LIMIT));
		
		// 모든 플레이어 초기 상태 설정
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
		
		// 게임 시작 후 경과 시간 계산
		long gameStartTime = gameStartTimes.getOrDefault(roomId, 0L);
		long gameElapsedTime = startTime - gameStartTime;
		long remainingTime = getRemainingGameTime(roomId);
		
		log.info("라운드 시작 시간 기록 [방ID: {}, 현재라운드: {}, 시간: {}, 게임경과: {}ms, 게임남은시간: {}ms]", 
				roomId, currentRounds.get(roomId), startTime, gameElapsedTime, remainingTime);
	}
	
	// 게임 남은 시간 계산 (밀리초)
	public long getRemainingGameTime(String roomId) {
		long startTime = gameStartTimes.getOrDefault(roomId, 0L);
		long duration = gameDurationLimits.getOrDefault(roomId, DEFAULT_GAME_DURATION_LIMIT);
		long currentTime = System.currentTimeMillis();
		long remainingTime = Math.max(0, startTime + duration - currentTime);
		
		log.debug("게임 남은 시간 계산 [방ID: {}, 시작: {}, 현재: {}, 제한: {}ms, 남은시간: {}ms]",
		        roomId, startTime, currentTime, duration, remainingTime);
		
		return remainingTime;
	}
	
	// 현재 라운드 경과 시간 (밀리초)
	public long getCurrentRoundElapsedTime(String roomId) {
		long roundStart = roundStartTimes.getOrDefault(roomId, 0L);
		if (roundStart == 0) {
			return 0;
		}
		
		long currentTime = System.currentTimeMillis();
		long elapsedTime = currentTime - roundStart;
		
		log.debug("라운드 경과 시간 [방ID: {}, 라운드: {}, 시작: {}, 현재: {}, 경과: {}ms]", 
		        roomId, currentRounds.get(roomId), roundStart, currentTime, elapsedTime);
		
		return elapsedTime;
	}
	
	/**
	 * 방에서 플레이어 나가기
	 * @param roomId 방 ID
	 * @param userId 사용자 ID
	 * @return 제거 성공 여부
	 */
	public boolean leaveRoom(String roomId, String userId) {
		if (!rooms.containsKey(roomId)) {
			log.warn("leaveRoom 실패 - 존재하지 않는 방 [방ID: {}, 사용자ID: {}]", roomId, userId);
			return false;
		}
		
		PlayerDto playerToRemove = findPlayer(roomId, userId);
		if (playerToRemove == null) {
			log.warn("leaveRoom 실패 - 존재하지 않는 플레이어 [방ID: {}, 사용자ID: {}]", roomId, userId);
			return false;
		}
		
		// 방에서 플레이어 제거
		boolean removed = rooms.get(roomId).remove(playerToRemove);
		
		// 현재 라운드의 선택 목록에서도 제거
		if (removed && roundSelections.containsKey(roomId)) {
			roundSelections.get(roomId).values().forEach(players -> 
				players.removeIf(p -> p.getUserId().equals(userId))
			);
		}
		
		log.info("플레이어 방 나가기 처리 [방ID: {}, 사용자ID: {}, 제거 성공: {}]", roomId, userId, removed);
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

	/**
	 * 사용자 ID로 플레이어 찾기
	 * @param roomId 방 ID
	 * @param userId 사용자 ID
	 * @return 플레이어 객체
	 */
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
