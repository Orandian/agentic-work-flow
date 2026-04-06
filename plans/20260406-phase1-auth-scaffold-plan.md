# Plan: ActiveCity Staff Portal — Phase 1: Auth & Scaffold
**Date:** 2026-04-06
**Stack:** Spring Boot 3.x + Next.js 15 + Supabase + PostgreSQL
**Target:** Complete auth flow + project scaffold

---

## Summary

Phase 1 delivers the complete project skeleton and a working authentication system for the ActiveCity Staff Portal. The backend (Spring Boot 3.x / Java 17 / MyBatis / PostgreSQL) exposes five public REST endpoints covering registration with OTP email verification, login with JWT issuance, and a forgot/reset-password flow secured by OTP. The frontend (Next.js 15 / TypeScript / TailwindCSS / Supabase Auth) provides four auth pages wired to TanStack Query hooks that call internal API routes, which in turn proxy to the Spring Boot backend. Supabase is used on the frontend only for session management and server-side client utilities; BCrypt + auth0 java-jwt own all credential logic on the backend.

Total tasks: 28, grouped into six dependency layers.

---

## Assumptions

1. PostgreSQL 15+ instance is available locally (or via Docker Compose). A `docker-compose.yml` will be provided for developer convenience but is not the primary deliverable.
2. A working SMTP account (e.g., SendGrid or Mailgun) is available for OTP email delivery; credentials go in `.env`.
3. Supabase project (free tier acceptable) has already been created; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are known.
4. Java 17 (LTS) and Node.js 20 (LTS) are installed on all developer machines.
5. Maven Wrapper (`mvnw`) will be committed so no global Maven installation is required.
6. OTP codes are numeric, 6 digits, and expire after 15 minutes; expiry is stored as a UTC timestamp in `user_verifications.expires_at`.
7. JWT expiry defaults to 8 hours; the secret is at least 32 characters and stored in `application.yml` via environment substitution.
8. Display font constraint ("never Inter, Roboto, Arial, Space Grotesk") is satisfied by using `Plus Jakarta Sans` (Google Fonts) as the primary typeface. CSS custom properties own all design tokens.
9. Email sending is implemented via Spring Boot `JavaMailSender`; a stub/mock bean is provided for tests.
10. `CommonValidator` is a plain utility class (not a Spring bean) with static methods; it throws `ApiErrorResponse` directly.

---

## Affected Files / Areas

### Backend (`activecity-api/`)
```
activecity-api/
├── pom.xml
├── .env.example
├── src/main/resources/
│   ├── application.yml
│   └── mapper/pub/UserMapper.xml
│   └── mapper/pub/UserVerificationMapper.xml
├── src/main/java/com/activecity/api/
│   ├── cm/
│   │   ├── ApiResponse.java
│   │   ├── ApiErrorResponse.java
│   │   ├── CommonValidator.java
│   │   ├── CommonMessage.java
│   │   ├── entity/User.java
│   │   ├── entity/UserVerification.java
│   │   └── enums/UserRole.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── JwtAuthFilter.java
│   │   ├── UserAuthProvider.java
│   │   ├── WebConfig.java
│   │   └── AuthorizeRequest.java
│   └── pub/
│       ├── controller/AuthController.java
│       ├── dto/RegisterRequest.java
│       ├── dto/VerifyOtpRequest.java
│       ├── dto/LoginRequest.java
│       ├── dto/ForgotPasswordRequest.java
│       ├── dto/ResetPasswordRequest.java
│       ├── dto/AuthResponse.java
│       ├── repository/UserMapper.java
│       ├── repository/UserVerificationMapper.java
│       └── service/AuthService.java
└── src/main/resources/db/
    └── V1__init_auth_schema.sql
```

### Frontend (`activecity-web/`)
```
activecity-web/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── middleware.ts
├── utils/supabase/
│   ├── client.ts
│   └── server.ts
├── types/auth/
│   └── index.ts
├── hooks/
│   └── useAuth.ts
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── (auth)/
│       ├── login/page.tsx
│       ├── register/page.tsx
│       ├── verify-otp/page.tsx
│       └── forgot-password/page.tsx
├── app/api/auth/
│   ├── login/route.ts
│   ├── register/route.ts
│   ├── verify-otp/route.ts
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
└── components/auth/
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    ├── VerifyOtpForm.tsx
    └── ForgotPasswordForm.tsx
```

---

## Risks & Decisions

| # | Risk / Decision | Mitigation |
|---|----------------|------------|
| 1 | OTP brute-force | Rate-limit `/pub/verify-otp` via Spring's `HandlerInterceptor`; max 5 attempts per 15-min window (Phase 2 hardening) |
| 2 | JWT secret exposure | Injected via env var `JWT_SECRET`; never hard-coded; validated at startup with a `@PostConstruct` check |
| 3 | SMTP credentials in env | `.env.example` ships redacted values; `.env` is git-ignored |
| 4 | Supabase session vs. JWT | Backend is the source of truth for JWT. Supabase is used only for session cookie handling on the Next.js layer. Supabase tokens are NOT sent to the Spring backend — only the Spring JWT is. |
| 5 | `JwtAuthFilter` not a Spring bean | Required by constraints. Registered manually in `SecurityConfig.addFilterBefore(new JwtAuthFilter(userAuthProvider), ...)` |
| 6 | No `@Valid` on controllers | All validation delegated to `CommonValidator` in the service layer; Spring validation is disabled for `pub/` DTOs |
| 7 | MyBatis XML vs. annotations | XML mappers used for all SQL per constraints; `@Mapper` annotation on interfaces for component scanning |
| 8 | Font constraint | `Plus Jakarta Sans` loaded via `next/font/google`; all sizes/weights exposed as CSS custom properties (`--font-display`, `--font-body`, etc.) |
| 9 | Password reset OTP reuse | `user_verifications` rows are hard-deleted after successful use; a new row is created per request |
| 10 | CORS in Spring | `WebConfig` implements `WebMvcConfigurer`; Next.js dev origin (`http://localhost:3000`) is explicitly listed; production origin injected via `CORS_ALLOWED_ORIGIN` env var |

---

## Implementation Tasks (ordered by dependency, assigned to agents)

### Layer 0 — Database Schema (no dependencies)

---

**TASK-01** | db-agent | Est: S
- File: `activecity-api/src/main/resources/db/V1__init_auth_schema.sql`
- Implement:
  - `CREATE TABLE users` with columns: `id` (BIGSERIAL PK), `email` (VARCHAR 255 UNIQUE NOT NULL), `password_hash` (TEXT NOT NULL), `full_name` (VARCHAR 255 NOT NULL), `role` (VARCHAR 20 NOT NULL DEFAULT 'STAFF'), `is_active` (BOOLEAN NOT NULL DEFAULT FALSE), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now())
  - `CREATE TABLE user_verifications` with columns: `id` (BIGSERIAL PK), `user_id` (BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE), `otp_code` (VARCHAR 10 NOT NULL), `type` (VARCHAR 30 NOT NULL — values: 'REGISTRATION', 'PASSWORD_RESET'), `expires_at` (TIMESTAMPTZ NOT NULL), `created_at` (TIMESTAMPTZ DEFAULT now())
  - Index on `user_verifications(user_id)` and `user_verifications(otp_code, type)`
  - Trigger or `updated_at` auto-update function for `users`
- Depends on: none

---

### Layer 1 — Backend Project Scaffold (no dependencies)

---

**TASK-02** | backend-agent | Est: M
- File: `activecity-api/pom.xml`
- Implement:
  - Spring Boot parent `3.3.x`, Java 17 source/target
  - Dependencies: `spring-boot-starter-web`, `spring-boot-starter-security`, `spring-boot-starter-mail`, `mybatis-spring-boot-starter` (3.x), `postgresql` (runtime), `auth0:java-jwt` (4.x), `spring-boot-starter-validation` (for framework use only), BCrypt via `spring-security-crypto`, `lombok`, `spring-boot-devtools` (optional)
  - Maven Wrapper plugin
  - `spring-boot-maven-plugin` for fat JAR
- Depends on: none

**TASK-03** | backend-agent | Est: S
- File: `activecity-api/src/main/resources/application.yml`
- Implement:
  - `spring.datasource` with `${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}`
  - `spring.mail` SMTP config with `${MAIL_HOST}`, `${MAIL_PORT}`, `${MAIL_USERNAME}`, `${MAIL_PASSWORD}`, TLS enabled
  - `mybatis.mapper-locations: classpath*:mapper/**/*.xml`, `mybatis.type-aliases-package: com.activecity.api.cm.entity`
  - `app.jwt.secret: ${JWT_SECRET}`, `app.jwt.expiry-hours: ${JWT_EXPIRY_HOURS:8}`
  - `app.cors.allowed-origin: ${CORS_ALLOWED_ORIGIN:http://localhost:3000}`
  - `server.port: 8080`
- Depends on: TASK-02

**TASK-04** | backend-agent | Est: S
- File: `activecity-api/.env.example`
- Implement: All env vars referenced in `application.yml` with placeholder/dummy values and inline comments explaining each
- Depends on: TASK-03

---

### Layer 2 — Backend Common Module (`cm/`)

---

**TASK-05** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/enums/UserRole.java`
- Implement: `public enum UserRole { STAFF, ADMIN }`
- Depends on: TASK-02

**TASK-06** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/entity/User.java`
- Implement: Lombok `@Data` POJO with fields matching DDL — `id`, `email`, `passwordHash`, `fullName`, `role` (UserRole), `isActive`, `createdAt`, `updatedAt`. Use `@Builder` for convenience.
- Depends on: TASK-05

**TASK-07** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/entity/UserVerification.java`
- Implement: Lombok `@Data` POJO — `id`, `userId`, `otpCode`, `type` (String), `expiresAt`, `createdAt`.
- Depends on: TASK-02

**TASK-08** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/ApiResponse.java`
- Implement: Generic wrapper `ApiResponse<T>` with fields `success` (boolean), `message` (String), `data` (T). Static factory methods `ok(T data)`, `ok(String message)`, `ok(String message, T data)`.
- Depends on: TASK-02

**TASK-09** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/ApiErrorResponse.java`
- Implement: `RuntimeException` subclass with `int status`, `String code`, `String message`. Constructor `ApiErrorResponse(int status, String code, String message)`. Used as the single error throw mechanism across all services.
- Depends on: TASK-02

**TASK-10** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/CommonMessage.java`
- Implement: Final class with public static final String constants for all user-facing messages:
  - `EMAIL_ALREADY_EXISTS`, `USER_NOT_FOUND`, `INVALID_OTP`, `OTP_EXPIRED`, `ACCOUNT_ALREADY_ACTIVE`, `ACCOUNT_NOT_ACTIVE`, `INVALID_CREDENTIALS`, `REGISTRATION_SUCCESS`, `OTP_SENT`, `PASSWORD_RESET_SUCCESS`, `LOGIN_SUCCESS`
- Depends on: TASK-02

**TASK-11** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/cm/CommonValidator.java`
- Implement: Static utility methods:
  - `requireNonBlank(String value, String fieldName)` — throws `ApiErrorResponse(400, "VALIDATION_ERROR", fieldName + " is required")`
  - `requireValidEmail(String email)` — regex check, throws on invalid
  - `requireMinLength(String value, String fieldName, int min)` — throws if shorter
  - `requireMatch(String a, String b, String fieldName)` — for password confirm
- Depends on: TASK-09, TASK-10

---

### Layer 3 — Backend Security Config & JWT

---

**TASK-12** | backend-agent | Est: M
- File: `activecity-api/src/main/java/com/activecity/api/config/UserAuthProvider.java`
- Implement:
  - `@Component` bean
  - Reads `app.jwt.secret` and `app.jwt.expiry-hours` via `@Value`
  - `@PostConstruct` validates secret length >= 32 chars
  - `createToken(User user)` — builds JWT with claims: `sub` = email, `userId`, `role`, `iat`, `exp`; signed with `Algorithm.HMAC256(secret)`
  - `validateToken(String token)` — decodes and returns `DecodedJWT`; throws `ApiErrorResponse(401, "INVALID_TOKEN", ...)` on failure
- Depends on: TASK-06, TASK-09

**TASK-13** | backend-agent | Est: M
- File: `activecity-api/src/main/java/com/activecity/api/config/JwtAuthFilter.java`
- Implement:
  - Extends `OncePerRequestFilter`; NOT annotated `@Component`
  - Constructor injection of `UserAuthProvider`
  - `doFilterInternal`: extracts `Authorization: Bearer <token>` header, calls `userAuthProvider.validateToken()`, sets `SecurityContextHolder` with `UsernamePasswordAuthenticationToken` carrying userId + role as authorities
  - Passes through silently (no exception) if header absent — SecurityConfig handles access control
- Depends on: TASK-12

**TASK-14** | backend-agent | Est: M
- File: `activecity-api/src/main/java/com/activecity/api/config/AuthorizeRequest.java`
- Implement:
  - `@Component` implementing `Customizer<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry>`
  - Rules: `/pub/**` → `permitAll()`, `/admin/**` → `hasRole("ADMIN")`, `/user/**` → `hasAnyRole("STAFF","ADMIN")`, everything else → `authenticated()`
- Depends on: TASK-02

**TASK-15** | backend-agent | Est: M
- File: `activecity-api/src/main/java/com/activecity/api/config/SecurityConfig.java`
- Implement:
  - `@Configuration @EnableWebSecurity`
  - `SecurityFilterChain` bean: disable CSRF, stateless session, inject `AuthorizeRequest`, register `JwtAuthFilter` via `addFilterBefore(new JwtAuthFilter(userAuthProvider), UsernamePasswordAuthenticationFilter.class)`
  - `PasswordEncoder` bean returning `BCryptPasswordEncoder`
- Depends on: TASK-13, TASK-14

**TASK-16** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/config/WebConfig.java`
- Implement:
  - `@Configuration` implementing `WebMvcConfigurer`
  - `addCorsMappings`: pattern `/**`, allowed origins from `${app.cors.allowed-origin}`, methods GET/POST/PUT/DELETE/OPTIONS, allowed headers `*`, `allowCredentials(true)`
- Depends on: TASK-03

---

### Layer 4 — Backend Auth Feature (`pub/`)

---

**TASK-17** | backend-agent | Est: M
- Files:
  - `activecity-api/src/main/java/com/activecity/api/pub/repository/UserMapper.java`
  - `activecity-api/src/main/resources/mapper/pub/UserMapper.xml`
- Implement (interface + XML):
  - `insertUser(User user)` — INSERT, use `useGeneratedKeys="true" keyProperty="id"`
  - `findByEmail(String email)` → `User`
  - `findById(Long id)` → `User`
  - `updateIsActive(Long userId, boolean isActive)`
  - `updatePassword(Long userId, String passwordHash)`
- Depends on: TASK-06, TASK-01

**TASK-18** | backend-agent | Est: M
- Files:
  - `activecity-api/src/main/java/com/activecity/api/pub/repository/UserVerificationMapper.java`
  - `activecity-api/src/main/resources/mapper/pub/UserVerificationMapper.xml`
- Implement (interface + XML):
  - `insertVerification(UserVerification uv)` — INSERT with generated key
  - `findByUserIdAndType(Long userId, String type)` → `UserVerification` (latest, order by created_at DESC, limit 1)
  - `deleteByUserId(Long userId, String type)` — hard delete after use
  - `deleteExpired()` — housekeeping (optional, for scheduled job)
- Depends on: TASK-07, TASK-01

**TASK-19** | backend-agent | Est: S
- Files: All five DTO files under `activecity-api/src/main/java/com/activecity/api/pub/dto/`
- Implement:
  - `RegisterRequest`: `email`, `password`, `confirmPassword`, `fullName`
  - `VerifyOtpRequest`: `email`, `otpCode`
  - `LoginRequest`: `email`, `password`
  - `ForgotPasswordRequest`: `email`
  - `ResetPasswordRequest`: `email`, `otpCode`, `newPassword`, `confirmPassword`
  - `AuthResponse`: `token`, `role`, `fullName`, `email`
  - All as Lombok `@Data @NoArgsConstructor @AllArgsConstructor`
- Depends on: TASK-02

**TASK-20** | backend-agent | Est: L
- File: `activecity-api/src/main/java/com/activecity/api/pub/service/AuthService.java`
- Implement `@Service` with constructor injection of `UserMapper`, `UserVerificationMapper`, `PasswordEncoder`, `UserAuthProvider`, `JavaMailSender`:
  - `register(RegisterRequest req)`:
    1. `CommonValidator.requireNonBlank`, `requireValidEmail`, `requireMinLength(password, 8)`, `requireMatch(password, confirmPassword)`
    2. Check email uniqueness via `userMapper.findByEmail`; throw `ApiErrorResponse(409, "EMAIL_EXISTS", CommonMessage.EMAIL_ALREADY_EXISTS)` if found
    3. Hash password with `passwordEncoder.encode`
    4. Build and insert `User` (isActive=false, role=STAFF)
    5. Generate 6-digit OTP, build `UserVerification` (type=REGISTRATION, expires 15 min), insert
    6. Send OTP email via `JavaMailSender`
    7. Return `ApiResponse.ok(CommonMessage.OTP_SENT)`
    8. `@Transactional(rollbackFor = Exception.class)`
  - `verifyOtp(VerifyOtpRequest req)`:
    1. Validate fields
    2. Find user by email; throw NOT_FOUND if absent
    3. Fetch latest REGISTRATION verification for user; throw INVALID_OTP if none
    4. Check expiry; throw OTP_EXPIRED if past
    5. Check code match; throw INVALID_OTP if mismatch
    6. `userMapper.updateIsActive(userId, true)`
    7. `userVerificationMapper.deleteByUserId(userId, "REGISTRATION")`
    8. Return `ApiResponse.ok(CommonMessage.REGISTRATION_SUCCESS)`
    9. `@Transactional`
  - `login(LoginRequest req)`:
    1. Validate fields
    2. Find user; throw INVALID_CREDENTIALS if not found or not active
    3. `passwordEncoder.matches`; throw INVALID_CREDENTIALS on mismatch
    4. `userAuthProvider.createToken(user)` → JWT string
    5. Return `ApiResponse.ok(CommonMessage.LOGIN_SUCCESS, new AuthResponse(token, role, fullName, email))`
  - `forgotPassword(ForgotPasswordRequest req)`:
    1. Validate email
    2. Find user; silently return success even if not found (prevent enumeration)
    3. Delete any existing PASSWORD_RESET verification for user
    4. Generate OTP, insert new verification
    5. Send reset email
    6. Return `ApiResponse.ok(CommonMessage.OTP_SENT)`
    7. `@Transactional`
  - `resetPassword(ResetPasswordRequest req)`:
    1. Validate all fields; `requireMatch(newPassword, confirmPassword)`, `requireMinLength(newPassword, 8)`
    2. Find user; throw NOT_FOUND if absent
    3. Fetch PASSWORD_RESET verification; check expiry and code
    4. `passwordEncoder.encode(newPassword)`, `userMapper.updatePassword`
    5. `userVerificationMapper.deleteByUserId(userId, "PASSWORD_RESET")`
    6. Return `ApiResponse.ok(CommonMessage.PASSWORD_RESET_SUCCESS)`
    7. `@Transactional`
- Depends on: TASK-11, TASK-12, TASK-15, TASK-17, TASK-18, TASK-19

**TASK-21** | backend-agent | Est: S
- File: `activecity-api/src/main/java/com/activecity/api/pub/controller/AuthController.java`
- Implement `@RestController @RequestMapping("/pub")`:
  - `POST /pub/register` → `authService.register(req)` → `ResponseEntity<Object>`
  - `POST /pub/verify-otp` → `authService.verifyOtp(req)` → `ResponseEntity<Object>`
  - `POST /pub/login` → `authService.login(req)` → `ResponseEntity<Object>`
  - `POST /pub/forgot-password` → `authService.forgotPassword(req)` → `ResponseEntity<Object>`
  - `POST /pub/reset-password` → `authService.resetPassword(req)` → `ResponseEntity<Object>`
  - Global `@ExceptionHandler(ApiErrorResponse.class)` returning `ResponseEntity` with `ApiErrorResponse.status`
  - Zero business logic — only delegate to service and wrap response
- Depends on: TASK-20

---

### Layer 5 — Frontend Project Scaffold (no backend dependency)

---

**TASK-22** | frontend-agent | Est: M
- File: `activecity-web/package.json`
- Implement:
  - Next.js 15, React 19, TypeScript
  - `@supabase/supabase-js`, `@supabase/ssr`
  - `@tanstack/react-query`, `axios`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - Dev dependencies: `typescript`, `@types/node`, `@types/react`
  - Scripts: `dev`, `build`, `start`, `lint`
- Depends on: none

**TASK-23** | frontend-agent | Est: S
- Files: `activecity-web/tsconfig.json`, `activecity-web/tailwind.config.ts`
- Implement:
  - `tsconfig.json`: strict mode, path alias `@/*` → `./`
  - `tailwind.config.ts`: content paths covering `app/**`, `components/**`, `hooks/**`; extend theme with CSS custom property references for `fontFamily` (var `--font-display`), `colors` (reference vars for brand, surface, text tokens)
- Depends on: TASK-22

**TASK-24** | frontend-agent | Est: S
- File: `activecity-web/.env.example`
- Implement:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
  - Inline comments for each
- Depends on: TASK-22

---

### Layer 6 — Frontend Auth Implementation

---

**TASK-25** | frontend-agent | Est: S
- Files: `activecity-web/utils/supabase/client.ts`, `activecity-web/utils/supabase/server.ts`
- Implement:
  - `client.ts`: `createBrowserClient` from `@supabase/ssr` using env vars; exported as singleton `createClient()`
  - `server.ts`: `createServerClient` from `@supabase/ssr`; reads/writes cookies via Next.js `cookies()` from `next/headers`; exported as async `createClient()`
- Depends on: TASK-22

**TASK-26** | frontend-agent | Est: S
- File: `activecity-web/middleware.ts`
- Implement:
  - Use `createServerClient` from `utils/supabase/server`
  - `matcher`: exclude `_next/static`, `_next/image`, `favicon.ico`, `/api/**`, `/(auth)/**`
  - On every matched request: call `supabase.auth.getUser()`; if no session redirect to `/login` preserving `?next=<original-path>`
  - Protected path prefixes: `/dashboard`, `/admin`, `/user`
- Depends on: TASK-25

**TASK-27** | frontend-agent | Est: M
- Files: `activecity-web/types/auth/index.ts`, `activecity-web/hooks/useAuth.ts`
- Implement:
  - `types/auth/index.ts`: interfaces `RegisterPayload`, `LoginPayload`, `VerifyOtpPayload`, `ForgotPasswordPayload`, `ResetPasswordPayload`, `AuthResponse`, `ApiResponse<T>`
  - `hooks/useAuth.ts`: TanStack Query `useMutation` hooks — `useRegister`, `useVerifyOtp`, `useLogin`, `useForgotPassword`, `useResetPassword`. Each uses `axios.post('/api/auth/<endpoint>', payload)`. On login success, store JWT in `localStorage` key `ac_token`. Export individual hooks.
- Depends on: TASK-25

**TASK-28** | frontend-agent | Est: L
- Files:
  - `activecity-web/app/layout.tsx` — root layout: load `Plus Jakarta Sans` via `next/font/google`; define all CSS custom properties in `:root` (colors, font vars, spacing tokens); wrap children in `QueryClientProvider`; `globals.css` imported here
  - `activecity-web/app/globals.css` — CSS custom properties: `--color-brand-primary`, `--color-brand-secondary`, `--color-surface`, `--color-surface-raised`, `--color-text-primary`, `--color-text-muted`, `--color-border`, `--font-display`, `--font-body`, `--radius-md`, `--radius-lg`; Tailwind base/components/utilities directives
  - `activecity-web/app/api/auth/login/route.ts` — POST: proxy to `${NEXT_PUBLIC_API_BASE_URL}/pub/login` via axios; return Spring response
  - `activecity-web/app/api/auth/register/route.ts` — POST: proxy to `/pub/register`
  - `activecity-web/app/api/auth/verify-otp/route.ts` — POST: proxy to `/pub/verify-otp`
  - `activecity-web/app/api/auth/forgot-password/route.ts` — POST: proxy to `/pub/forgot-password`
  - `activecity-web/app/api/auth/reset-password/route.ts` — POST: proxy to `/pub/reset-password`
  - `activecity-web/components/auth/LoginForm.tsx` — controlled form; uses `useLogin`; on success saves token, redirects to `/dashboard`; shows inline error from mutation
  - `activecity-web/components/auth/RegisterForm.tsx` — email/fullName/password/confirmPassword fields; uses `useRegister`; on success redirects to `/verify-otp?email=<email>`
  - `activecity-web/components/auth/VerifyOtpForm.tsx` — single OTP code input; reads `email` from query params; uses `useVerifyOtp`; on success redirects to `/login`
  - `activecity-web/components/auth/ForgotPasswordForm.tsx` — email + submit; uses `useForgotPassword`; shows success message; link to reset-password form
  - `activecity-web/app/(auth)/login/page.tsx` — renders `LoginForm`; link to `/register` and `/forgot-password`
  - `activecity-web/app/(auth)/register/page.tsx` — renders `RegisterForm`; link to `/login`
  - `activecity-web/app/(auth)/verify-otp/page.tsx` — renders `VerifyOtpForm`
  - `activecity-web/app/(auth)/forgot-password/page.tsx` — renders `ForgotPasswordForm`
  - Typography: `Plus Jakarta Sans` only; all font references via `var(--font-display)` / `var(--font-body)`; no system fonts
- Depends on: TASK-26, TASK-27

---

## Suggested Agent Delegation Order

```
Round 1 (parallel — no deps):
  db-agent    → TASK-01
  backend-agent → TASK-02, TASK-05
  frontend-agent → TASK-22

Round 2 (parallel — after round 1):
  backend-agent → TASK-03, TASK-06, TASK-07, TASK-08, TASK-09, TASK-10
  frontend-agent → TASK-23, TASK-24

Round 3 (parallel — after round 2):
  backend-agent → TASK-04, TASK-11

Round 4 (parallel — after round 3):
  backend-agent → TASK-12, TASK-16
  frontend-agent → TASK-25

Round 5 (parallel — after round 4):
  backend-agent → TASK-13, TASK-14, TASK-17, TASK-18, TASK-19
  frontend-agent → TASK-26, TASK-27

Round 6 (sequential):
  backend-agent → TASK-15 (depends on 13+14)
               → TASK-20 (depends on 15+17+18+19)
               → TASK-21 (depends on 20)
  frontend-agent → TASK-28 (depends on 26+27)
```

---

## Definition of Done

- [ ] PostgreSQL schema applies cleanly via `psql -f V1__init_auth_schema.sql` with no errors
- [ ] Spring Boot starts without errors; `/actuator/health` returns 200
- [ ] `POST /pub/register` with valid payload returns 200 and triggers OTP email (verified in maildev or logs)
- [ ] `POST /pub/verify-otp` with correct OTP returns 200 and sets `users.is_active = true`
- [ ] `POST /pub/login` with activated account returns 200 with a valid JWT
- [ ] JWT decoded with the correct secret contains `sub`, `userId`, `role`, `exp`
- [ ] `POST /pub/login` with wrong password returns 401
- [ ] `POST /pub/forgot-password` sends reset OTP email; duplicate calls replace the old OTP row
- [ ] `POST /pub/reset-password` with valid OTP updates `password_hash` and deletes the verification row
- [ ] All 5 Spring endpoints return `ApiErrorResponse` shape (not Spring's default error) on invalid input
- [ ] Next.js dev server starts (`npm run dev`) without type errors
- [ ] `/login`, `/register`, `/verify-otp`, `/forgot-password` pages render without runtime errors
- [ ] Navigating to `/dashboard` without a session redirects to `/login`
- [ ] Login flow end-to-end: register → verify OTP → login → JWT stored in `localStorage` → redirect to `/dashboard`
- [ ] No inline font names (Inter, Roboto, Arial, Space Grotesk) appear anywhere in frontend source
- [ ] All design tokens resolved via CSS custom properties; no hardcoded hex values in component files
- [ ] `CORS` headers present on Spring responses when `Origin: http://localhost:3000` is sent
- [ ] `.env.example` files exist for both backend and frontend; no real secrets committed
- [ ] `JwtAuthFilter` is NOT annotated `@Component` or `@Bean`
- [ ] No `@Valid` annotations appear in any `pub/` controller or service
- [ ] All SQL uses `#{}` parameter syntax; no `${}` in any mapper XML
