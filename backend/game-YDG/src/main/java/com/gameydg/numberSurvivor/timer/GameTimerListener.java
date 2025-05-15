package com.gameydg.numberSurvivor.timer;

// 게임의 시간 관련 이벤트를 처리하기 위한 콜백 메서드들을 정의
public interface GameTimerListener {
	// 대기 카운트다운 이벤트
	void onWaitingCountdown(String roomCode, int timeLeft);

	// 준비 시작 이벤트
	void onPrepareStart(String roomCode);

	// 준비 카운트다운 이벤트
	void onPrepareCountdown(String roomCode, int timeLeft);

	// 게임 시작 이벤트
	void onGameStart(String roomCode);
} 