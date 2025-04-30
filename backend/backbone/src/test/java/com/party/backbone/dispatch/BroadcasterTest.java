package com.party.backbone.dispatch;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.websocket.broadcast.Broadcaster;
import com.party.backbone.websocket.message.GameMessage;

@SpringBootTest
public class BroadcasterTest {

	@Autowired
	private Broadcaster broadcaster;

	private final MockRoomRedisRepository roomRepository = new MockRoomRedisRepository();

	private final MockSessionRegistry sessionRegistry = new MockSessionRegistry();

	@Test
	void broadcastTest() throws Exception {
		// given
		List<String> userIds = new ArrayList<>();
		for (int i = 0; i < 1000; i++) {
			String userId = "user-" + i;
			userIds.add(userId);

			WebSocketSession mockSession = new MockWebSocketSession(userId);

			sessionRegistry.register(userId, mockSession);
		}

		roomRepository.setUserIds(userIds);

		var sessions = sessionRegistry.getOpenSessions(userIds);
		long start = System.currentTimeMillis();
		broadcaster.broadcast(sessions, "test-room", "TEST_PAYLOAD");
		long end = System.currentTimeMillis();

		System.out.println("[Test] broadcast 호출 완료까지 걸린 시간 = " + (end - start) + "ms");

		// 비동기 메시지가 다 끝나길 기다리기 (적당히)
		Thread.sleep(5000);
	}

	static class DummyGameMessage implements GameMessage {

		@Override
		public String getRequestId() {
			return "";
		}
		// 테스트용 GameMessage
	}
}