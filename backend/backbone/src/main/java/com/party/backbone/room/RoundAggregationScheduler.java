package com.party.backbone.room;

import java.util.Set;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoundAggregationScheduler {
	private final RoomRedisRepository roomRepository;
	private final RoundAggregationService roundAggregationService;

	private static final int MAX_ROUNDS_TO_PROCESS_PER_RUN = 10;

	@Scheduled(fixedRateString = "1000")
	@SchedulerLock(name = "aggregatePendingRoundsLock",
		lockAtLeastFor = "PT2S",  // 최소 2초간 락 유지
		lockAtMostFor = "PT15S") // 최대 15초간 락 유지
	public void aggregateDueRounds() {
		log.debug("[AggregationScheduler] Checking for due rooms to aggregate.");
		long currentTimeMillis = System.currentTimeMillis();

		Set<String> dueRooms = roomRepository.getDueRooms(currentTimeMillis,
			MAX_ROUNDS_TO_PROCESS_PER_RUN);

		if (dueRooms.isEmpty()) {
			log.debug("[AggregationScheduler] No rooms due for aggregation at this moment.");
			return;
		}

		log.info("[AggregationScheduler] Found {} due rooms to process: {}", dueRooms.size(), dueRooms);

		for (String roomCode : dueRooms) {
			if (roomRepository.removeRoomFromPending(roomCode)) {

				try {
					log.info("[AggregationScheduler] Triggering aggregation for {}", roomCode);
					roundAggregationService.aggregateRound(roomCode);
				} catch (Exception e) {
					log.error(
						"[AggregationScheduler] Error during aggregation trigger for {}. Re-adding to pending list might be needed.",
						roomCode, e);
					// TODO: 재처리 로직
				}
			} else {
				log.info("[AggregationScheduler] {} was likely processed by another instance or already removed.",
					roomCode);
			}
		}
		log.debug("[AggregationScheduler] Finished checking for due rooms.");
	}
}
