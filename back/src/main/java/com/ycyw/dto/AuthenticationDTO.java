package com.ycyw.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthenticationDTO(
		@NotBlank(message = "The username cannot be empty.")
		String username,

		@NotBlank(message = "The password is required.")
		String password
) {
}
