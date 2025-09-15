package com.ycyw.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

	@Bean
	public ChannelInterceptor clientIdInterceptor() {
		return new ChannelInterceptor() {
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {
				var acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
				if (acc != null && StompCommand.CONNECT.equals(acc.getCommand())) {
					var cid = first(acc, "X-Client-Id");
					if (cid != null && !cid.isBlank()) {
						acc.getSessionAttributes().put("clientId", cid);

					}
				}
				return message;
			}
			private String first(StompHeaderAccessor acc, String name) {
				var list = acc.getNativeHeader(name);
				return (list != null && !list.isEmpty()) ? list.get(0) : null;
			}
		};
	}


	@Bean
	public ChannelInterceptor stompAuthInterceptor() {
		return new ChannelInterceptor() {
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {
				var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
				if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
					try {
						var authHeaders = accessor.getNativeHeader("Authorization");
						if (authHeaders != null && !authHeaders.isEmpty()) {
							String value = authHeaders.get(0);
							if (value != null && value.startsWith("Bearer ")) {
								String raw = value.substring(7);
								if (raw != null && !raw.isBlank() && !"null".equalsIgnoreCase(raw)) {
									Jwt jwt = jwtDecoder.decode(raw);
									AbstractAuthenticationToken authentication =
											(AbstractAuthenticationToken) jwtAuthenticationConverter.convert(jwt);
									if (authentication != null) {
										authentication.setAuthenticated(true);
										accessor.setUser(authentication); // attache le Principal à la session STOMP
									}
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
