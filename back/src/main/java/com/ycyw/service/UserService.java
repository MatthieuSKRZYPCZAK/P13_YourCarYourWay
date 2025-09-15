package com.ycyw.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import static com.ycyw.common.ResponseMessages.INVALID_IDENTIFIER;

@Service
public class UserService {

	private final AuthenticationManager authenticationManager;

	@Autowired
	public UserService(AuthenticationManager authenticationManager) {
		this.authenticationManager = authenticationManager;
	}

	public Authentication authenticate(String username, String password) {
		try {
			Authentication auth = authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(username, password));
			SecurityContextHolder.getContext().setAuthentication(auth);
			return auth;
		} catch (AuthenticationException e) {
			throw new BadCredentialsException(INVALID_IDENTIFIER);
		}
	}
}
