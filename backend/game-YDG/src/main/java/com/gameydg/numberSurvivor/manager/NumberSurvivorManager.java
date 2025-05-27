package com.gameydg.numberSurvivor.manager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

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

	// 모든 라운드 저장 필드
	private final Map<String, List<RoundResultDto>> roundResults = new ConcurrentHashMap<>();

	// 게임 제한 시간 설정
	public void setGameDurationLimit(String roomCode, long durationMs) {
		gameDurationLimits.put(roomCode, durationMs);
	}

	public void joinRoom(String roomCode, PlayerDto player) {
		rooms.computeIfAbsent(roomCode, k -> ConcurrentHashMap.newKeySet()).add(player);
		currentRounds.putIfAbsent(roomCode, 1);
		roundSelections.putIfAbsent(roomCode, new ConcurrentHashMap<>());
		gameDurationLimits.putIfAbsent(roomCode, DEFAULT_GAME_DURATION_LIMIT);

		// log.info("[게임 매니저] 플레이어 입장 [방ID: {}, 사용자ID: {}, 닉네임: {}]",
		//	roomCode, player.getUserId(), player.getNickname());
	}

	public void startGame(String roomCode) {
		if (!rooms.containsKey(roomCode)) {
			rooms.putIfAbsent(roomCode, ConcurrentHashMap.newKeySet());
		}

		if (!currentRounds.containsKey(roomCode)) {
			currentRounds.put(roomCode, 1);
		}

		if (!roundSelections.containsKey(roomCode)) {
			roundSelections.put(roomCode, new ConcurrentHashMap<>());
		} else {
			roundSelections.get(roomCode).clear();
		}

		long startTime = System.currentTimeMillis();
		gameStartTimes.put(roomCode, startTime);

		log.info("[게임 매니저] 게임 시작 [방ID: {}, 플레이어: {}명, 제한시간: {}ms]",
			roomCode, rooms.get(roomCode).size(),
			gameDurationLimits.getOrDefault(roomCode, DEFAULT_GAME_DURATION_LIMIT));

		if (rooms.containsKey(roomCode)) {
			Set<PlayerDto> players = rooms.get(roomCode);
			if (players != null) {
				// 동시성 문제를 피하기 위해 복사본 생성 후 처리
				new ArrayList<>(players).forEach(player -> {
					player.setAlive(true);
					player.setSelectedNumber(null);
				});
			}
		}
	}

	// 라운드 시작 시간 기록
	public void setRoundStartTime(String roomCode) {
		long startTime = System.currentTimeMillis();
		roundStartTimes.put(roomCode, startTime);

		log.info("[게임 매니저] 라운드 시작 [방ID: {}, 라운드: {}]",
			roomCode, currentRounds.get(roomCode));
	}

	// 게임 남은 시간 계산 (밀리초)
	public long getRemainingGameTime(String roomCode) {
		long startTime = gameStartTimes.getOrDefault(roomCode, 0L);
		long duration = gameDurationLimits.getOrDefault(roomCode, DEFAULT_GAME_DURATION_LIMIT);
		long currentTime = System.currentTimeMillis();
		return Math.max(0, startTime + duration - currentTime);
	}

	// 현재 라운드 경과 시간 (밀리초)
	public long getCurrentRoundElapsedTime(String roomCode) {
		long roundStart = roundStartTimes.getOrDefault(roomCode, 0L);
		if (roundStart == 0) {
			return 0;
		}
		return System.currentTimeMillis() - roundStart;
	}

	// 방에서 플레이어 나가기
	public boolean leaveRoom(String roomCode, String userId) {
		if (!rooms.containsKey(roomCode)) {
			// log.warn("[게임 매니저] 방 퇴장 실패 - 존재하지 않는 방 [방ID: {}, 사용자ID: {}]", roomCode, userId);
			return false;
		}

		PlayerDto playerToRemove = findPlayer(roomCode, userId);
		if (playerToRemove == null) {
			// log.warn("[게임 매니저] 방 퇴장 실패 - 존재하지 않는 플레이어 [방ID: {}, 사용자ID: {}]", roomCode, userId);
			return false;
		}

		boolean removed = rooms.get(roomCode).remove(playerToRemove);

		if (removed && roundSelections.containsKey(roomCode)) {
			roundSelections.get(roomCode).values().forEach(players ->
				players.removeIf(p -> p.getUserId().equals(userId))
			);
		}

		// log.info("[게임 매니저] 플레이어 퇴장 [방ID: {}, 사용자ID: {}, 닉네임: {}]",
		//	roomCode, userId, playerToRemove.getNickname());
		return removed;
	}

	public void selectNumber(String roomCode, String userId, int number) {
		PlayerDto player = findPlayer(roomCode, userId);
		if (player != null && player.isAlive()) {
			player.setSelectedNumber(number);
			roundSelections.get(roomCode)
				.computeIfAbsent(number, k -> new ArrayList<>())
				.add(player);
		}
	}

	public RoundResultDto processRound(String roomCode) {
		Map<Integer, List<PlayerDto>> selections = new HashMap<>(roundSelections.get(roomCode));
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

		currentRounds.put(roomCode, currentRounds.get(roomCode) + 1);
		roundSelections.get(roomCode).clear();

		log.info("[게임 매니저] 라운드 결과 [방ID: {}, 라운드: {}, 생존자: {}명, 탈락자: {}명]",
			roomCode, currentRounds.get(roomCode) - 1, survivors.size(), eliminated.size());

		return RoundResultDto.builder()
			.round(currentRounds.get(roomCode) - 1)
			.numberSelections(selections)
			.survivors(survivors)
			.eliminated(eliminated)
			.build();
	}

	public boolean isGameOver(String roomCode) {
		if (!rooms.containsKey(roomCode)) {
			return false;
		}
		
		Set<PlayerDto> players = rooms.get(roomCode);
		if (players == null) {
			return false;
		}
		
		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		long aliveCount = new ArrayList<>(players).stream()
			.filter(PlayerDto::isAlive)
			.count();

		if (aliveCount <= 2) {
			log.info("[게임 매니저] 게임 종료 조건 충족 [방ID: {}, 생존자: {}명]", roomCode, aliveCount);
			return true;
		}
		return false;
	}

	public boolean isAllDead(String roomCode) {
		if (!rooms.containsKey(roomCode)) {
			return true;
		}
		
		Set<PlayerDto> players = rooms.get(roomCode);
		if (players == null || players.isEmpty()) {
			return true;
		}
		
		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		boolean allDead = new ArrayList<>(players).stream().noneMatch(PlayerDto::isAlive);
		if (allDead) {
			log.info("[게임 매니저] 전원 탈락 [방ID: {}]", roomCode);
		}
		return allDead;
	}

	public List<PlayerDto> getWinners(String roomCode) {
		if (!rooms.containsKey(roomCode)) {
			return new ArrayList<>();
		}
		
		Set<PlayerDto> players = rooms.get(roomCode);
		if (players == null) {
			return new ArrayList<>();
		}
		
		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		List<PlayerDto> winners = new ArrayList<>(players).stream()
			.filter(PlayerDto::isAlive)
			.toList();

		log.info("[게임 매니저] 우승자 결정 [방ID: {}, 우승자: {}명]",
			roomCode, winners.size());

		return winners;
	}

	// 사용자 ID로 플레이어 찾기
	public PlayerDto findPlayer(String roomCode, String userId) {
		if (!rooms.containsKey(roomCode)) {
			return null;
		}
		
		Set<PlayerDto> players = rooms.get(roomCode);
		if (players == null) {
			return null;
		}
		
		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		return new ArrayList<>(players).stream()
			.filter(p -> p.getUserId().equals(userId))
			.findFirst()
			.orElse(null);
	}

	// 현재 방의 플레이어 수를 반환합니다.
	public int getCurrentPlayerCount(String roomCode) {
		if (!rooms.containsKey(roomCode)) {
			return 0;
		}
		return rooms.get(roomCode).size();
	}

	// 최종 결과 추가 메서드
	public void addRoundResult(String roomCode, RoundResultDto result) {
		roundResults.computeIfAbsent(roomCode, k -> new ArrayList<>()).add(result);
	}

	// 최종 결과 조회 메서드
	public List<RoundResultDto> getRoundResults(String roomCode) {
		return roundResults.getOrDefault(roomCode, new ArrayList<>());
	}

	// 최종 게임 종료 후 결과 초기화 메서드
	public void clearRoundResults(String roomCode) {
		roundResults.remove(roomCode);
	}
}
