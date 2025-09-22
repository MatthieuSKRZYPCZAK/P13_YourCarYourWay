package com.ycyw.controller;

import com.ycyw.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class SupportController {
	private final SimpMessagingTemplate messaging;

	@MessageMapping("support.message")
	public void fromClient(ClientMsg in,
						   Principal principal,
						   Authentication auth,
						   SimpMessageHeaderAccessor sha) {
		Map<String, Object> attrs = sha.getSessionAttributes();
		String clientId = attrs != null ? (String) attrs.get("clientId") : null;
		if (clientId == null) {
			return;
		}

		String sender = in.sender() != null ? in.sender() : (principal != null ? principal.getName() : null);
		String role = in.role();
		if (role == null) {
			if (auth != null && auth.isAuthenticated()) {
				role = auth.getAuthorities().stream()
						.findFirst().map(GrantedAuthority::getAuthority)
						.orElse("ROLE_CLIENT");
			} else {
				role = "GUEST";
			}
		}

		AdminMsg out = new AdminMsg(clientId, sender, role, Instant.now(), in.content(), in.type());

		messaging.convertAndSend("/topic/support.admin", out);
		messaging.convertAndSend("/queue/support/" + clientId, out);
	}

	@MessageMapping("support.reply")
	public void fromAdmin(AdminReply in, Principal principal) {

		AdminMsg out = new AdminMsg(
				in.getTargetClientId(),
				principal != null ? principal.getName() : "support",
				"ROLE_EMPLOYEE",
				Instant.now(),
				in.getContent(),
				in.getType()
		);
		messaging.convertAndSend("/queue/support/" + in.getTargetClientId(), out);
		messaging.convertAndSend("/topic/support.admin", out);
	}
}
