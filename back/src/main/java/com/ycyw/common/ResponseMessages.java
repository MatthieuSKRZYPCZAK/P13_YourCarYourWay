package com.ycyw.common;

/**
 * Classe utilitaire contenant l’ensemble des messages de réponse utilisés dans l’application.
 */
public class ResponseMessages {

	private ResponseMessages() {}

	// Authentication & Authorization
	public static final String INVALID_IDENTIFIER = "Invalid username or password";
	public static final String AUTHENTICATION_FAILED = "Authentication failed. User could not be authenticated.";
	public static final String INVALID_JWT = "Invalid or missing JWT token";
	public static final String REFRESH_TOKEN_NOT_FOUND = "No refresh token found.";
}