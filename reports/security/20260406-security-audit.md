# Security Audit Report
**Date:** 2026-04-06
**Audited by:** security-auditor agent
**Stack:** Spring Boot 3.3.4 + Next.js 15.0.0 + Supabase (@supabase/ssr 0.5.0)
**OWASP Reference:** Top 10 2025

---

## Executive Summary

The ActiveCity Staff Portal codebase demonstrates a solid security baseline for an early-stage project. No hardcoded secrets, no SQL injection vectors, and no double-registration of the JWT filter were found. The most significant findings are two medium-severity issues that must be addressed before production deployment: (1) the JWT token is persisted in `localStorage` rather than an `HttpOnly` cookie, exposing it to XSS theft, and (2) OTP generation uses `java.util.Random` (non-cryptographically secure) instead of `SecureRandom`. A cluster of lower-severity issues — absence of rate limiting, missing HTTP security headers, verbose logging in development config, and an informational SSRF note — round out the report.

Total findings: **0 Critical · 0 High · 3 Medium · 5 Low / Informational**

---

## Findings

### CRITICAL (fix before any deployment)

None identified.

---

### HIGH (fix before demo)

None identified.

---

### MEDIUM (fix before production)

#### M-1 — JWT stored in localStorage (XSS-accessible token storage)
- **File:** `activecity-web/hooks/useAuth.ts` line 50
- **Code:** `localStorage.setItem('ac_token', data.data.token)`
- **Risk:** Any JavaScript running on the page (injected via XSS, a compromised npm package, or a browser extension) can read `localStorage` and steal the bearer token, leading to full account takeover. `localStorage` has no `HttpOnly` protection.
- **OWASP:** A02 Cryptographic Failures / A03 Injection (XSS vector)
- **Fix:** Store the JWT in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie set by the Next.js API route handler on the server side. Remove the `localStorage.setItem` call. Read the token server-side for Spring Boot API calls.

#### M-2 — OTP generated with `java.util.Random` (non-cryptographic PRNG)
- **File:** `activecity-api/src/main/java/com/activecity/api/pub/service/AuthService.java` line 372
- **Code:** `new Random().nextInt(1_000_000)`
- **Risk:** `java.util.Random` is a linear congruential generator. Its output is predictable if an attacker can observe a seed (e.g., timing side channels or multiple OTP observations). OTPs must be generated with a cryptographically secure source.
- **OWASP:** A02 Cryptographic Failures
- **Fix:** Replace with `SecureRandom`:
  ```java
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();
  // ...
  return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
  ```
  Import `java.security.SecureRandom` and remove `java.util.Random`.

#### M-3 — No HTTP security response headers on the Next.js frontend
- **File:** `activecity-web/next.config.ts` (empty config)
- **Risk:** The frontend sends no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Strict-Transport-Security` headers. This leaves the app open to clickjacking, MIME-sniffing, and reduces defence-in-depth against XSS.
- **OWASP:** A05 Security Misconfiguration
- **Fix:** Add a `headers()` export to `next.config.ts`:
  ```ts
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    }]
  }
  ```

---

### LOW / Informational

#### L-1 — No rate limiting or brute-force protection on auth endpoints
- **Files:** `AuthController.java`, all Next.js `app/api/auth/*/route.ts`
- **Risk:** An attacker can make unlimited login attempts (brute-force password), OTP verification attempts (brute-force 6-digit OTP = 10^6 possibilities, takeable in minutes with no throttle), and forgot-password requests (email flooding). The OTP space is only 1,000,000 values and the OTP is valid for 15 minutes — at an unthrottled 1,000 req/s an attacker has a 15-minute window to enumerate ~900,000 codes.
- **OWASP:** A07 Identification and Authentication Failures
- **Phase 2 fix:** Add Spring's `spring-boot-starter-data-redis` + Bucket4j, or a reverse-proxy rule (nginx `limit_req`). For Next.js routes, add `@upstash/ratelimit` or Vercel Edge rate limiting. Minimum: lock account / require CAPTCHA after 5 failed OTP attempts.

#### L-2 — Verbose logging level in the single `application.yml`
- **File:** `activecity-api/src/main/resources/application.yml` lines 49–52
- **Config:**
  ```yaml
  logging:
    level:
      com.activecity: DEBUG
      org.mybatis: DEBUG
  ```
- **Risk:** DEBUG logging for MyBatis will log full SQL statements including all bound parameter values in production. While passwords are hashed, email addresses, user IDs, and OTP codes may appear in plain text in application logs.
- **OWASP:** A09 Security Logging and Monitoring Failures
- **Fix:** Split config into `application.yml` (prod defaults, `INFO`) and `application-dev.yml` (`DEBUG`). Activate dev profile only locally.

#### L-3 — `NEXT_PUBLIC_API_BASE_URL` used inside server-side Next.js API routes (informational exposure risk)
- **Files:** All `activecity-web/app/api/auth/*/route.ts`
- **Risk:** The `NEXT_PUBLIC_` prefix causes Next.js to bundle the value into the client-side JavaScript bundle at build time, making the Spring Boot API URL visible in the browser. This is not a secret but it unnecessarily reveals internal infrastructure topology to any user who inspects the page source.
- **OWASP:** A05 Security Misconfiguration (low)
- **Fix:** Rename to `API_BASE_URL` (no `NEXT_PUBLIC_` prefix) since this value is only read server-side in Route Handlers. Update `.env.example` accordingly.

#### L-4 — `supabase.auth.getSession()` used in middleware (Supabase recommendation: use `getUser()`)
- **File:** `activecity-web/middleware.ts` line 46
- **Risk:** Supabase's own documentation (as of late 2024) recommends using `supabase.auth.getUser()` in server-side code rather than `getSession()` for session freshness validation, because `getSession()` reads from cookies and does not re-validate the token with the Supabase Auth server. An expired or revoked session may still pass the middleware check until the cookie naturally expires.
- **OWASP:** A07 Identification and Authentication Failures (low)
- **Fix:** Replace with `const { data: { user } } = await supabase.auth.getUser()` and gate on `user` instead of `session`.

#### L-5 — Spring Boot 3.3.4 — minor patch versions available (dependency hygiene)
- **File:** `activecity-api/pom.xml` line 11
- **Version:** `spring-boot-starter-parent:3.3.4`
- **Note:** Spring Boot 3.3.x is currently maintained (supported until August 2025). As of the audit date, 3.3.x patch releases beyond 3.3.4 may exist. No CVEs affecting 3.3.4 are known at audit time, but the project should track releases. Also note: `next@15.0.0` and `@supabase/ssr@0.5.0` — latest stable versions should be periodically verified.
- **OWASP:** A06 Vulnerable and Outdated Components
- **Action:** Pin to latest patch within the 3.3.x line; use Dependabot or Renovate for automated dependency monitoring.

---

## What looks good

- **No hardcoded secrets** — all sensitive config (`JWT_SECRET`, `DB_PASSWORD`, `MAIL_PASSWORD`, CORS origin) injected via environment variables. `application.yml` is clean.
- **JWT implementation is secure** — `@Value("${app.jwt.secret}")` injection, `@PostConstruct` length guard (>= 32 chars), explicit expiry (`expiryHours`), HMAC256 signing, and `JWTVerifier` validation. No "none" algorithm risk.
- **JwtAuthFilter NOT a @Component** — manually instantiated in `SecurityConfig`, preventing double-registration and the security bypass that would result.
- **SQL injection clean** — all MyBatis XML mappers use `#{}` (parameterized) exclusively. No `${}` string interpolation found anywhere.
- **CORS properly scoped** — `WebConfig` uses a single specific origin from `${CORS_ALLOWED_ORIGIN}` (defaults to localhost:3000), not wildcard `*`. `allowCredentials(true)` is therefore safe.
- **Access control rules correct** — `AuthorizeRequest.java` enforces: `/pub/**` → `permitAll`, `/admin/**` → `ADMIN` only, `/user/**` → `STAFF | ADMIN`, and `anyRequest().authenticated()` as catch-all. No dangerous open wildcards.
- **Frontend middleware protects dashboard/admin/user paths** — regex patterns `^\/dashboard`, `^\/admin`, `^\/user` checked; unauthenticated users redirected to `/login` with `?next=` parameter.
- **BCrypt password hashing** — `BCryptPasswordEncoder` bean used consistently. No MD5 or SHA-1 found.
- **Minimum password length enforced** — both server (`CommonValidator.requireMinLength(password, "Password", 8)`) and client (`RegisterForm.tsx` line 35) enforce 8-character minimum.
- **Password never logged or returned** — `AuthResponse` returns only `token`, `role`, `fullName`, `email`. `User` entity's `passwordHash` field is not in any DTO. No log statements output passwords.
- **OTP lifecycle correct** — 15-minute expiry enforced, OTP hard-deleted after successful verification (both REGISTRATION and PASSWORD_RESET flows).
- **Email enumeration prevention** — `forgotPassword` returns success even when email not found. `login` returns `INVALID_CREDENTIALS` (not "user not found") for unknown emails.
- **Transactions with rollback** — all write service methods annotated `@Transactional(rollbackFor = Exception.class)`.
- **Console errors in Next.js routes log error objects only** — `console.error('[POST /api/auth/login]', error)` — no credentials, tokens, or PII in the logged value.
- **No SQL debug output configured** — `show-sql` is not set in `application.yml`; only MyBatis log-impl is configured (addressed in L-2 above).

---

## Prioritized Action List

| # | Finding | Severity | Effort | Fix by |
|---|---------|----------|--------|--------|
| 1 | M-2: Replace `java.util.Random` with `SecureRandom` for OTP generation | MEDIUM | 15 min | Before any demo / beta |
| 2 | M-1: Move JWT from `localStorage` to `HttpOnly` cookie | MEDIUM | 2–4 h | Before production |
| 3 | M-3: Add HTTP security headers in `next.config.ts` | MEDIUM | 1 h | Before production |
| 4 | L-1: Implement rate limiting on auth endpoints | LOW | 4–8 h | Phase 2 / sprint 2 |
| 5 | L-2: Split `application.yml` into prod/dev profiles (log levels) | LOW | 30 min | Before production |
| 6 | L-3: Rename `NEXT_PUBLIC_API_BASE_URL` → `API_BASE_URL` | LOW | 15 min | Next sprint |
| 7 | L-4: Replace `getSession()` with `getUser()` in middleware | LOW | 15 min | Next sprint |
| 8 | L-5: Enroll in automated dependency monitoring (Dependabot/Renovate) | LOW | 1 h setup | Next sprint |

---

## Re-audit Checklist

- [ ] `AuthService.java` — `generateOtp()` uses `SecureRandom` (not `java.util.Random`)
- [ ] `useAuth.ts` — JWT stored in `HttpOnly` cookie, `localStorage.setItem` call removed
- [ ] `next.config.ts` — `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` headers present
- [ ] `application.yml` — `logging.level.com.activecity` and `logging.level.org.mybatis` set to `INFO` (DEBUG moved to `application-dev.yml`)
- [ ] `.env.example` — `NEXT_PUBLIC_API_BASE_URL` renamed to `API_BASE_URL`
- [ ] `middleware.ts` — `supabase.auth.getUser()` used instead of `getSession()`
- [ ] Auth endpoints — rate limiting in place (login, verify-otp, forgot-password)
- [ ] `pom.xml` — Spring Boot version updated to latest 3.3.x patch; Renovate/Dependabot configured
- [ ] No hardcoded secrets — confirmed by re-running secret scan grep
- [ ] No `${}` in MyBatis XML — confirmed by re-running XML grep
