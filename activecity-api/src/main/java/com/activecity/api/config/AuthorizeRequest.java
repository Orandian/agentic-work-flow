package com.activecity.api.config;

import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

/**
 * Centralises all HTTP authorization rules so that {@link SecurityConfig}
 * stays concise.
 *
 * <p>Route rules:
 * <ul>
 *   <li>{@code /pub/**}   — public, no authentication required</li>
 *   <li>{@code /admin/**} — ADMIN role only</li>
 *   <li>{@code /user/**}  — STAFF or ADMIN</li>
 *   <li>everything else   — authenticated</li>
 * </ul>
 * </p>
 */
@Component
public class AuthorizeRequest implements
        Customizer<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry> {

    @Override
    public void customize(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry) {

        registry
                .requestMatchers("/pub/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/user/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated();
    }
}
