package com.party.backbone.room;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.uuid.Generators;
import com.party.backbone.room.dto.CreateRoomResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class RoomController {
	private final RoomRedisRepository roomRepository;

	@PostMapping("/rooms")
	ResponseEntity<CreateRoomResponse> createRoom() {
		String administratorId = Generators.timeBasedEpochRandomGenerator().generate().toString();
		String roomCode = roomRepository.generateUniqueRoomCode();
		roomRepository.createRoom(roomCode, administratorId);

		return ResponseEntity.status(HttpStatus.CREATED).body(new CreateRoomResponse(roomCode, administratorId));
	}
}
