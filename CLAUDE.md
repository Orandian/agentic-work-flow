# CLAUDE.md — ActiveCity Staff Portal

Context file for Claude Code agents working in this repository. Read this before making any changes.

---

## Project Overview

ActiveCity Staff Portal is an internal web application for city government employees. Phase 1 delivers a complete authentication scaffold: OTP-verified registration, JWT login, and a forgot/reset-password flow — with a Spring Boot REST API backend and a Next.js frontend that proxies auth requests and manages sessions via Supabase SSR.

---

## Stack Summary

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.5.3 · Java 21 · MyBatis 3.0.4 · Spring Security · auth0 java-jwt 4.5.0 |
| Frontend | Next.js 16.2.2 · React 19.2.4 · TypeScript 6 · Tailwind CSS 4 · TanStack Query · Axios |
| Auth | BCrypt + HMAC256 JWT on backend; Supabase SSR cookie sessions on frontend |
| Database | PostgreSQL 15+ |
| Testing | JUnit 5 + Spring Boot Test · Vitest + Testing Library |

---

## Run Commands

```bash
# Backend (from activecity-api/)
./mvnw spring-boot:run

# Frontend (from activecity-web/)
pnpm dev

# Backend tests
./mvnw test

# Frontend tests
pnpm vitest run
```

---

## Key Conventions

These six rules are non-negotiable across the entire codebase:

1. **No `@Valid` on `pub/` controllers or DTOs.** All input validation is performed in the service layer via `CommonValidator` static methods (`requireNonBlank`, `requireValidEmail`, `requireMinLength`, `requireMatch`). Never add `@Valid` or `@Validated` to anything under `pub/`.

2. **All user-facing messages must come from `CommonMessage`.** Never inline string literals for messages in service or controller code. Always reference a constant in `com.activecity.api.cm.CommonMessage`. Add new constants there when needed.

3. **All SQL uses `#{}` — never `${}`.** All MyBatis XML mapper files must use parameterized `#{}` syntax only. `${}` string interpolation is forbidden regardless of context.

4. **`JwtAuthFilter` must NOT be a Spring bean.** It extends `OncePerRequestFilter` but has no `@Component` annotation. It is manually instantiated inside `SecurityConfig` via `addFilterBefore(new JwtAuthFilter(userAuthProvider), ...)`. Annotating it would cause it to run twice.

5. **Controllers have zero business logic.** `AuthController` (and any future controller) delegates entirely to its service. The only code permitted at the controller level is calling the service method and returning `ResponseEntity.ok(result)`. The `@ExceptionHandler` for `ApiErrorResponse` may also live here.

6. **Plus Jakarta Sans is the only permitted typeface.** No Inter, Roboto, Arial, or Space Grotesk in any frontend file. All font and color values are exposed through CSS custom properties (`var(--font-display)`, `var(--font-body)`, `var(--color-*)`, etc.) defined in `app/globals.css`. No hardcoded hex values in component files.

---

## Agent Team

| Agent | Trigger / Responsibility |
|---|---|
| **db-agent** | Database schema changes — DDL migrations (`db/V*.sql`), indexes, triggers |
| **backend-agent** | All Java/Spring Boot code — entities, mappers, services, controllers, security config |
| **frontend-agent** | All Next.js/TypeScript code — pages, components, hooks, Route Handlers, Tailwind styles |
| **security-auditor** | Security reviews after any auth-related change; writes to `reports/security/` |
| **code-reviewer** | Code quality reviews on pull requests; writes to `reports/code-review/` |
| **planner** | Phase planning before new work begins; writes to `plans/` |
| **documenter** | Writes/updates `README.md`, `docs/api.md`, and this file from actual source code |

---

## File Structure

### Backend — key directories

```
activecity-api/src/main/java/com/activecity/api/
├── cm/                        # Shared cross-cutting module
│   ├── ApiResponse.java       # Generic success envelope ApiResponse<T>
│   ├── ApiErrorResponse.java  # RuntimeException thrown by services; caught by controller
│   ├── CommonMessage.java     # All user-facing message string constants
│   ├── CommonValidator.java   # Static validation helpers
│   ├── entity/                # User, UserVerification POJOs (Lombok @Data @Builder)
│   └── enums/UserRole.java    # STAFF | ADMIN
├── config/                    # Spring Security, JWT, CORS
│   ├── SecurityConfig.java    # FilterChain: stateless, CSRF disabled, JwtAuthFilter wired
│   ├── JwtAuthFilter.java     # NOT @Component — extends OncePerRequestFilter
│   ├── UserAuthProvider.java  # createToken() / validateToken() via auth0 java-jwt
│   ├── AuthorizeRequest.java  # Route authorization rules
│   └── WebConfig.java         # CORS configuration
└── pub/                       # Unauthenticated public feature package
    ├── controller/AuthController.java
    ├── dto/                   # RegisterRequest, VerifyOtpRequest, LoginRequest,
    │                          #   ForgotPasswordRequest, ResetPasswordRequest, AuthResponse
    ├── repository/            # UserMapper.java, UserVerificationMapper.java (MyBatis @Mapper)
    └── service/AuthService.java

activecity-api/src/main/resources/
├── application.yml            # All config via ${ENV_VAR} substitution
├── db/V1__init_auth_schema.sql
└── mapper/pub/                # MyBatis XML files (UserMapper.xml, UserVerificationMapper.xml)
```

### Frontend — key directories

```
activecity-web/
├── middleware.ts              # Supabase getUser() session guard; protects /dashboard, /admin, /user
├── app/
│   ├── layout.tsx             # Root layout: Plus Jakarta Sans font, CSS vars, Providers wrapper
│   ├── globals.css            # CSS custom properties (:root), Tailwind directives
│   ├── providers.tsx          # QueryClientProvider (TanStack Query)
│   ├── (auth)/                # Auth pages: login, register, verify-otp, forgot-password
│   └── api/auth/              # Next.js Route Handlers proxying to Spring Boot /pub/*
├── components/auth/           # LoginForm, RegisterForm, VerifyOtpForm, ForgotPasswordForm
├── hooks/useAuth.ts           # TanStack Query useMutation hooks for all 5 auth actions
├── types/auth/index.ts        # TypeScript interfaces for all auth payloads and responses
└── utils/supabase/
    ├── client.ts              # Browser Supabase client (createBrowserClient)
    └── server.ts              # Server Supabase client (createServerClient + cookies)
```

---

## Security Notes

The following three medium-severity findings from the 2026-04-06 security audit (`reports/security/20260406-security-audit.md`) must be resolved before production deployment:

**M-1 — JWT stored in `localStorage` (XSS-accessible)**
- File: `activecity-web/hooks/useAuth.ts`
- The JWT is written to `localStorage` on login. Any XSS payload or compromised npm package can read it.
- Fix: Store the JWT in an `HttpOnly` + `Secure` + `SameSite=Strict` cookie set by the Next.js API route handler. Remove the `localStorage.setItem` call.

**M-2 — OTP generated with `java.util.Random` (non-cryptographic PRNG)**
- File: `activecity-api/.../pub/service/AuthService.java`
- The security audit flagged use of `java.util.Random`; the current source already uses `SecureRandom`. Verify this is in place before any demo: `new SecureRandom().nextInt(1_000_000)`. <!-- TODO: verify audit vs. current source -->

**M-3 — No HTTP security headers on the Next.js frontend**
- File: `activecity-web/next.config.ts`
- No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Strict-Transport-Security` headers are set.
- Fix: Add a `headers()` export to `next.config.ts` covering all routes.
