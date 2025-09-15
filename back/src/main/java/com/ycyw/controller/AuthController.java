package com.ycyw.controller;

import com.ycyw.dto.AuthenticationDTO;
import com.ycyw.dto.AuthenticationResponseDTO;
import com.ycyw.exception.AuthenticationFailedException;
import com.ycyw.exception.InvalidJwtException;
import com.ycyw.exception.RefreshTokenException;
import com.ycyw.security.JwtTokenUtil;
import com.ycyw.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import static com.ycyw.common.ResponseMessages.*;

@RestController
@RequestMapping("/api")
public class AuthController {

	private final JwtTokenUtil jwtService;
	private final UserService userService;

	private final AuthenticationManager authenticationManager;

	public AuthController(JwtTokenUtil jwtService, UserService userService, AuthenticationManager authenticationManager) {
		this.jwtService = jwtService;
		this.userService = userService;
		this.authenticationManager = authenticationManager;
	}


	@PostMapping("/login")
	public ResponseEntity<AuthenticationResponseDTO> login(@Valid @RequestBody AuthenticationDTO req,
														   HttpServletResponse response) {

		Authentication authentication = userService.authenticate(req.username(), req.password());
		if(!authentication.isAuthenticated()) {
			throw new AuthenticationFailedException(AUTHENTICATION_FAILED);
		}

		UserDetails userDetails = (UserDetails) authentication.getPrincipal();

		String token = jwtService.generateToken(userDetails);
		jwtService.generateAndSetRefreshToken(userDetails, response);

		return ResponseEntity.ok(new AuthenticationResponseDTO(token));

	}

	@GetMapping("/logout")
	public ResponseEntity<?> apiLogout(HttpServletResponse response) {
		jwtService.clearAccessToken(response);
		jwtService.clearRefreshToken(response);

		SecurityContextHolder.clearContext();

		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	public Map<String, Object> me() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		boolean authenticated = authentication != null
				&& authentication.isAuthenticated()
				&& !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);

		String username = authenticated ? authentication.getName() : "guest";

		String role = "GUEST";
		if (authenticated) {
			boolean isEmployee = authentication.getAuthorities().stream()
					.map(org.springframework.security.core.GrantedAuthority::getAuthority)
					.anyMatch("ROLE_EMPLOYEE"::equals);
			role = isEmployee ? "EMPLOYEE" : "CLIENT";
		}

		Map<String, Object> body = new HashMap<>();
		body.put("authenticated", authenticated);
		body.put("username", username);
		body.put("role", role);
		return body;
	}

	@PostMapping("/refresh")
	public ResponseEntity<AuthenticationResponseDTO> refreshToken(HttpServletRequest request, HttpServletResponse response) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			jwtService.clearRefreshToken(response);
			throw new RefreshTokenException(REFRESH_TOKEN_NOT_FOUND);
		}

		String refreshToken = null;
		for (Cookie cookie : cookies) {
			if ("refreshToken".equals(cookie.getName())) {
				refreshToken = cookie.getValue();
				break;
			}
		}

		if (refreshToken == null) {
			jwtService.clearRefreshToken(response);
			throw new RefreshTokenException(INVALID_JWT);
		}

		UserDetails user;
		try {
			// Vérifier et extraire l'userdetails depuis le refresh token
			user = jwtService.extractUserDetailsFromToken(refreshToken);
		} catch (InvalidJwtException e) {
			jwtService.clearRefreshToken(response);
			throw new RefreshTokenException(INVALID_JWT);
		}

		// Génère un nouvel access token et refresh token
		String newAccessToken = jwtService.generateToken(user);
		jwtService.generateAndSetRefreshToken(user, response);

		return ResponseEntity.ok(new AuthenticationResponseDTO(newAccessToken));
	}
}
