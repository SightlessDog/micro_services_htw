package com.ecom.product.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private static final String ZITADEL_ROLES_CLAIM = "urn:zitadel:iam:org:project:roles";

    // Zitadel JWT access tokens stay minimal (sub/aud/exp only) — project role
    // grants only appear via the userinfo endpoint. Cache per-token to avoid a
    // round trip to Zitadel on every request.
    private static final long ROLES_CACHE_TTL_MS = 60_000;
    private static final int USERINFO_TIMEOUT_MS = 3_000;

    @Value("${zitadel.issuer}")
    private String zitadelIssuer;

    @Value("${zitadel.jwks-uri}")
    private String zitadelJwksUri;

    @Value("${zitadel.userinfo-uri}")
    private String zitadelUserinfoUri;

    @Value("${zitadel.audience}")
    private String zitadelAudience;

    // Swept on each write so it stays bounded by the number of distinct tokens
    // seen within the TTL window, instead of growing forever.
    private final Map<String, CachedRoles> rolesCache = new ConcurrentHashMap<>();

    private record CachedRoles(List<String> roles, long expiresAt) {}

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, RestTemplate userinfoRestTemplate) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(new AntPathRequestMatcher("/actuator/**")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/products", "GET")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/products/*", "GET")).permitAll()
                        .anyRequest().hasAuthority("ROLE_admin")
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder())
                                .jwtAuthenticationConverter(jwtAuthenticationConverter(userinfoRestTemplate)))
                );
        return http.build();
    }

    @Bean
    public RestTemplate userinfoRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(USERINFO_TIMEOUT_MS);
        factory.setReadTimeout(USERINFO_TIMEOUT_MS);
        return new RestTemplate(factory);
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri(zitadelJwksUri)
                .build();

        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(zitadelIssuer);
        OAuth2TokenValidator<Jwt> withAudience = jwt ->
                jwt.getAudience().contains(zitadelAudience)
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                                new OAuth2Error("invalid_token", "Required audience is missing", null));

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience));
        return decoder;
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter(RestTemplate restTemplate) {
        return jwt -> {
            Collection<GrantedAuthority> authorities = fetchRoles(jwt, restTemplate).stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
            return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
        };
    }

    private List<String> fetchRoles(Jwt jwt, RestTemplate restTemplate) {
        String jti = jwt.getId();
        long now = System.currentTimeMillis();

        CachedRoles cached = rolesCache.get(jti);
        if (cached != null && cached.expiresAt() > now) {
            return cached.roles();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt.getTokenValue());

        List<String> roles;
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    zitadelUserinfoUri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            roles = extractRoles(response.getBody());
        } catch (RestClientException ex) {
            log.warn("Failed to fetch roles from userinfo endpoint: {}", ex.getMessage());
            roles = List.of();
        }

        rolesCache.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
        rolesCache.put(jti, new CachedRoles(roles, now + ROLES_CACHE_TTL_MS));
        return roles;
    }

    private static List<String> extractRoles(Map<String, Object> body) {
        if (body != null && body.get(ZITADEL_ROLES_CLAIM) instanceof Map<?, ?> rolesMap) {
            return rolesMap.keySet().stream().map(Object::toString).collect(Collectors.toList());
        }
        return List.of();
    }

}
