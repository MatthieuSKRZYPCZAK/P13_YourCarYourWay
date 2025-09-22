package com.ycyw.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;
import java.util.Objects;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final JwtDecoder jwtDecoder;
	private final JwtAuthenticationConverter jwtAuthenticationConverter;


	public WebSocketConfig(JwtDecoder jwtDecoder, JwtAuthenticationConverter jwtAuthenticationConverter) {
		this.jwtDecoder = jwtDecoder;
		this.jwtAuthenticationConverter = jwtAuthenticationConverter;
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry
				.addEndpoint("/api/ws-chat")
				.setAllowedOriginPatterns("http://localhost:4200")
				.withSockJS();
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.enableSimpleBroker("/topic", "/queue"); // diffusion
		registry.setApplicationDestinationPrefixes("/app"); // @MessageMapping("...")
		registry.setUserDestinationPrefix("/user"); // unicast
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(
				stompAuthInterceptor(),
				clientIdInterceptor()
		);
	}

	/**
	 * Intercepteur STOMP qui récupère l’en-tête <code>X-Client-Id</code> lors du CONNECT
	 * et l’enregistre dans les attributs de session STOMP sous la clé <code>clientId</code>.
	 * <p>
	 * Router les messages vers une file dédiée au client (<code>/queue/support/{clientId}</code>).
	 * </p>
	 */
	@Bean
	public ChannelInterceptor clientIdInterceptor() {
		return new ChannelInterceptor() {
			@Override
			public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
				StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
				if (acc != null && StompCommand.CONNECT.equals(acc.getCommand())) {
					String cid = first(acc);
					if (cid != null && !cid.isBlank()) {
						Objects.requireNonNull(acc.getSessionAttributes()).put("clientId", cid);
					}
				}
				return message;
			}
			private String first(StompHeaderAccessor acc) {
				List<String> list = acc.getNativeHeader("X-Client-Id");
				return (list != null && !list.isEmpty()) ? list.getFirst() : null;
			}
		};
	}

	/**
	 * Intercepteur STOMP qui lors du CONNECT, lit le header Authorization (Bearer JWT),
	 * décode le token et attache l’Authentication Spring Security à la session STOMP.
	 * <p>
	 * Identifie l’utilisateur sur les messages entrants/sortants
	 * </p>
	 */
	@Bean
	public ChannelInterceptor stompAuthInterceptor() {
		return new ChannelInterceptor() {
			@Override
			public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
				StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
				if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
					try {
						List<String> authHeaders = accessor.getNativeHeader("Authorization");
						if (authHeaders != null && !authHeaders.isEmpty()) {
							String value = authHeaders.getFirst();
							if (value != null && value.startsWith("Bearer ")) {
								String raw = value.substring(7);
								if (!raw.isBlank() && !"null".equalsIgnoreCase(raw)) {
									Jwt jwt = jwtDecoder.decode(raw);
									AbstractAuthenticationToken authentication = jwtAuthenticationConverter.convert(jwt);
									authentication.setAuthenticated(true);
									accessor.setUser(authentication); // attache le Principal à la session STOMP
								}
							}
						}
					} catch (Exception e) {
						// log.warn("WS auth failed: {}", e.toString());
					}
				}
				return message;
			}
		};
	}


}
