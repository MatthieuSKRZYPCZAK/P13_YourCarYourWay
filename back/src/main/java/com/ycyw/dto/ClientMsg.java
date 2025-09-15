package com.ycyw.dto;

public record ClientMsg(
		String content,
		String type,
		String sender,
		String role,
		String clientId
) {
}
