package com.ycyw.dto;

import java.time.Instant;

public record AdminMsg(
		String clientId,
		String sender,
		String role,
		Instant timestamp,
		String content,
		String type
) {
}
