package com.ycyw.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
public class JwtConfig {

	/**
	 * Clé secrète utilisée pour signer et vérifier les JWT.
	 * <p>
	 * Cette valeur est injectée depuis le fichier de configuration {@code application.properties}
	 * sous la clé {@code app.jwtSecret}.
	 * </p>
	 */
	@Value("${app.jwtSecret}")
	private String jwtSecret;

	/**
	 * Crée un bean {@link JwtEncoder} pour générer des JWT signés.
	 * <p>
	 * Utilise {@link NimbusJwtEncoder} avec une clé secrète HMAC-SHA256 pour assurer
	 * l'intégrité des tokens.
	 * </p>
	 *
	 * @return Une instance de {@link JwtEncoder} configurée avec la clé secrète.
	 */
	@Bean
	public JwtEncoder jwtEncoder() {
		return new NimbusJwtEncoder(new ImmutableSecret<>(this.jwtSecret.getBytes()));
	}

	/**
	 * Crée un bean {@link JwtDecoder} pour valider et décoder les JWT.
	 * <p>
	 * Utilise {@link NimbusJwtDecoder} avec HMAC-SHA256 pour s'assurer que les tokens
	 * sont bien signés avec la clé correcte.
	 * </p>
	 *
	 * @return Une instance de {@link JwtDecoder} configurée pour la validation des JWT.
	 */
	@Bean
	public JwtDecoder jwtDecoder() {
		return NimbusJwtDecoder.withSecretKey(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256")).build();
	}
}
