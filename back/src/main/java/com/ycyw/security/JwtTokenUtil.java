package com.ycyw.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.*;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;


@Service
public class JwtTokenUtil {

	public static final String JWT_REFRESH_URL = "/api/refresh";

	private final JwtEncoder jwtEncoder;
	private final JwtDecoder jwtDecoder;
	private final UserDetailsService userDetailsService;

	@Value("${app.jwtExpirationMs}")
	private int jwtExpirationInMs;

	@Value("${app.jwtRefreshExpirationMs}")
	private int jwtRefreshExpirationInMs;

	@Autowired
	public JwtTokenUtil(JwtEncoder jwtEncoder, JwtDecoder jwtDecoder, UserDetailsService userDetailsService) {
		this.jwtEncoder = jwtEncoder;
		this.jwtDecoder = jwtDecoder;
		this.userDetailsService = userDetailsService;
	}

	public String generateToken(UserDetails user) {
		List<String> roles = user.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority)
				.map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
				.toList();

		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(String.valueOf(user.getUsername()))
				.issuedAt(now)
				.expiresAt(now.plusMillis(jwtExpirationInMs))
				.claim("roles", roles)
				.build();

		return this.jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
	}

	public void generateAndSetRefreshToken(UserDetails user, HttpServletResponse response) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(String.valueOf(user.getUsername()))
				.issuedAt(now)
				.expiresAt(now.plusMillis(jwtRefreshExpirationInMs))
				.build();

		String refreshToken = this.jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

		Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);
		refreshTokenCookie.setHttpOnly(true);
		refreshTokenCookie.setSecure(false); // à true en production pour HTTPS
		refreshTokenCookie.setPath(JWT_REFRESH_URL);
		refreshTokenCookie.setMaxAge(jwtRefreshExpirationInMs / 1000);

		response.addCookie(refreshTokenCookie);
	}

	/**
	 * Supprime le refresh token du navigateur.
	 */
	public void clearRefreshToken(HttpServletResponse response) {
		Cookie deleteCookie = new Cookie("refreshToken", "");
		deleteCookie.setHttpOnly(true);
		deleteCookie.setSecure(false); // à true en production pour HTTPS
		deleteCookie.setPath(JWT_REFRESH_URL);
		deleteCookie.setMaxAge(0); // Expiration immédiate

		response.addCookie(deleteCookie);
	}

	/**
	 * Supprime le refresh token du navigateur.
	 */
	public void clearAccessToken(HttpServletResponse response) {
		Cookie deleteCookie = new Cookie("token", "");
		deleteCookie.setHttpOnly(true);
		deleteCookie.setSecure(false); // à true en production pour HTTPS
		deleteCookie.setPath(JWT_REFRESH_URL);
		deleteCookie.setMaxAge(0); // Expiration immédiate

		response.addCookie(deleteCookie);
	}

	public UserDetails extractUserDetailsFromToken(String token) {
		String username = extractUsernameFromToken(token);
		return userDetailsService.loadUserByUsername(username);
	}

	public String extractUsernameFromToken(String token) {
		Jwt decodedJwt = jwtDecoder.decode(token);
		return decodedJwt.getSubject();
	}
}
