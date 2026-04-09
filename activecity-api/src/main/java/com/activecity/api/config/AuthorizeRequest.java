package com.activecity.api.config;

import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
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
                .requestMatchers(new AntPathRequestMatcher("/pub/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/actuator/health")).permitAll()
                .requestMatchers(
                        new AntPathRequestMatcher("/swagger-ui"),
                        new AntPathRequestMatcher("/swagger-ui/"),
                        new AntPathRequestMatcher("/swagger-ui/**"),
                        new AntPathRequestMatcher("/swagger-ui.html"),
                        new AntPathRequestMatcher("/v3/api-docs"),
                        new AntPathRequestMatcher("/v3/api-docs/**")
                ).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/admin/**")).hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/user/**")).hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated();
    }
}
