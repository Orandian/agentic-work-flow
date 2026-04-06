package com.activecity.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration.
 *
 * <p>Key decisions:
 * <ul>
 *   <li>CSRF disabled — stateless REST API, no cookies for session management</li>
 *   <li>Session policy: STATELESS</li>
 *   <li>{@link JwtAuthFilter} registered manually — NOT a Spring bean</li>
 *   <li>BCrypt as the password encoder</li>
 * </ul>
 * </p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final AuthorizeRequest authorizeRequest;
    private final UserAuthProvider userAuthProvider;

    public SecurityConfig(AuthorizeRequest authorizeRequest,
                          UserAuthProvider userAuthProvider) {
        this.authorizeRequest = authorizeRequest;
        this.userAuthProvider = userAuthProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorizeRequest)
                .addFilterBefore(
                        new JwtAuthFilter(userAuthProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
