# Code Review — Phase 1
**Date:** 2026-04-06
**Reviewer:** code-reviewer agent (claude-sonnet-4-6)
**Scope:** Backend auth API + Frontend auth UI + Tests

---

## Code Review Summary

**Files reviewed:** 47
**Overall assessment:** ⚠️ Needs attention

---

### 🔴 Critical Issues (must fix)

#### 1. DTO field name mismatch — `VerifyOtpPayload` vs backend contract
**File:** `activecity-web/types/auth/index.ts` (line 13–16)

```ts
export interface VerifyOtpPayload {
  email: string
  otp: string        // ← sent to /api/auth/verify-otp as "otp"
}
```

**File:** `activecity-api/src/main/java/com/activecity/api/pub/dto/VerifyOtpRequest.java` (line 12)

```java
private String otpCode;   // ← backend expects "otpCode"
```

The frontend sends `{ email, otp }` but the backend `VerifyOtpRequest` deserialises the field named `otpCode`. Jackson will leave `otpCode` as `null`, causing the OTP to always evaluate as "null != submittedCode" → every OTP verification will return `INVALID_OTP`. This is a **runtime contract break** — the feature will never work end-to-end.

Fix: rename the TS type field to `otpCode`, or add `@JsonProperty("otp")` to the Java DTO.

---

#### 2. `ResetPasswordPayload` uses `token` but backend expects `email` + `otpCode`
**File:** `activecity-web/types/auth/index.ts` (lines 22–26)

```ts
export interface ResetPasswordPayload {
  token: string          // ← no such field on the backend
  newPassword: string
  confirmPassword: string
}
```

**File:** `activecity-api/…/pub/dto/ResetPasswordRequest.java`

```java
private String email;
private String otpCode;
private String newPassword;
private String confirmPassword;
```

The frontend DTO is structurally wrong: it has `token` instead of `email + otpCode`. There is no reset-password page/form either — `useResetPassword` is exported but never wired to a UI. The test for `useResetPassword` uses `token` which mirrors the wrong type, so the test passes but would fail against the real API.

Fix: align `ResetPasswordPayload` with the backend — `{ email, otpCode, newPassword, confirmPassword }` — and build the missing reset-password page.

---

#### 3. `NEXT_PUBLIC_API_BASE_URL` used server-side in Next.js Route Handlers
**Files:** all five `activecity-web/app/api/auth/*/route.ts`

```ts
`${process.env.NEXT_PUBLIC_API_BASE_URL}/pub/login`
```

Route Handlers execute on the server. `NEXT_PUBLIC_*` variables are inlined at build time for client bundles, but they are also available in the server Node.js environment **as long as they are defined**. However, the conventional and secure approach is to use a server-only variable (e.g. `API_BASE_URL`, without the `NEXT_PUBLIC_` prefix) for server-to-server calls. Using `NEXT_PUBLIC_` exposes the internal backend URL to the browser via the compiled client bundle, which is a minor information disclosure. More critically, if `NEXT_PUBLIC_API_BASE_URL` is not set at runtime the proxy silently constructs `undefined/pub/login`, returns a 500, and the user gets a generic error with no diagnosis path.

Fix: rename to `API_BASE_URL` (no `NEXT_PUBLIC_` prefix) in the route handlers, and add a startup check or a clear error message when the variable is missing.

---

### 🟡 Warnings (should fix)

#### W1. JWT stored in `localStorage` — XSS risk
**File:** `activecity-web/hooks/useAuth.ts` (line 51)

```ts
localStorage.setItem('ac_token', data.data.token)
```

`localStorage` is readable by any JavaScript on the page. If any third-party script or XSS vector runs, the JWT is immediately exfiltrated. The project already uses Supabase cookies (see middleware), so a consistent approach would be `httpOnly` cookies for the JWT as well, or at minimum a comment documenting the accepted trade-off.

#### W2. `sendOtpEmail` error message is an inline string — not from `CommonMessage`
**File:** `activecity-api/…/pub/service/AuthService.java` (line 387)

```java
throw new ApiErrorResponse(500, "MAIL_ERROR",
        "Failed to send verification email. Please try again.");
```

Every other error string in `AuthService` uses a `CommonMessage` constant. This one is inlined. Add `CommonMessage.MAIL_ERROR` or reuse `CommonMessage.INTERNAL_SERVER_ERROR`.

#### W3. Middleware uses `supabase.auth.getSession()` (deprecated in newer SSR packages)
**File:** `activecity-web/middleware.ts` (line 46)

`getSession()` returns the session from the cookie without re-validating against the Supabase Auth server. The recommended replacement (since `@supabase/ssr` 0.5+) is `supabase.auth.getUser()`, which performs a network validation and prevents stale/spoofed session tokens from bypassing protected routes. If the project is on an older version this is fine, but it should be verified and documented.

#### W4. `AuthorizeRequest` mock in `AuthControllerTest` may have unexpected side-effects
**File:** `activecity-api/…/pub/controller/AuthControllerTest.java` (line 49)

`AuthorizeRequest` is `@MockBean`-ed, meaning the real security rules (permit `/pub/**`, require auth elsewhere) are not active during these tests. All tests use `@WithMockUser` and succeed, but the tests do not exercise or verify that `/pub/**` is actually open without authentication — they test only the happy-path structure. This is not a bug in the test but it means the security configuration itself is never tested.

Consider adding a dedicated `SecurityConfig` slice test that hits `/pub/login` without `@WithMockUser` and confirms `200`, and that hitting `/dashboard` without auth gets `401/403`.

#### W5. `generateOtp()` uses `java.util.Random` — not cryptographically secure
**File:** `activecity-api/…/pub/service/AuthService.java` (line 371–373)

```java
private String generateOtp() {
    return String.format("%06d", new Random().nextInt(1_000_000));
}
```

`java.util.Random` is a linear-congruential generator; its output is predictable given enough samples. For a security-sensitive OTP use `SecureRandom` instead:

```java
private static final SecureRandom SECURE_RANDOM = new SecureRandom();

private String generateOtp() {
    return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
}
```

#### W6. `logging.level` is `DEBUG` for MyBatis in `application.yml`
**File:** `activecity-api/src/main/resources/application.yml` (lines 49–52)

```yaml
logging:
  level:
    com.activecity: DEBUG
    org.mybatis: DEBUG
```

MyBatis debug logging outputs the full SQL statements and their parameters. In production this would log every email address and (more critically) the BCrypt password-hash lookup input to stdout. These log settings must be overridden in a production profile (`application-prod.yml`) with `WARN` or `ERROR`.

#### W7. Error banner uses hard-coded RGBA colour values instead of CSS variables
**Files:** all four auth form components (e.g. `LoginForm.tsx` line 120–121)

```tsx
background: 'rgba(243, 139, 168, 0.12)',
border: '1px solid rgba(243, 139, 168, 0.3)',
```

The checklist requires "all colors via CSS custom properties in component files". The error banner backgrounds are hard-coded raw RGBA values derived from `--color-error` (`#f38ba8` → rgb `243, 139, 168`). These should reference the variable:

```tsx
background: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
```

Or define dedicated `--color-error-bg` / `--color-error-border` tokens in `globals.css`.

The same pattern appears in `ForgotPasswordForm.tsx` success banner (`rgba(166, 227, 161, ...)` derived from `--color-success`).

#### W8. Button pressed-state colour `#1e1e2e` is hard-coded
**Files:** `LoginForm.tsx` line 254, `RegisterForm.tsx` line 279, `ForgotPasswordForm.tsx` line 222, `VerifyOtpForm.tsx` line 213

```tsx
color: login.isPending ? 'var(--color-text-muted)' : '#1e1e2e',
```

`#1e1e2e` is the `--color-bg` value. Reference `var(--color-bg)` instead so the theme can be changed in one place.

#### W9. `VerifyOtpForm` submit guard threshold is `< 4`, not `< 6`
**File:** `activecity-web/components/auth/VerifyOtpForm.tsx` (lines 202, 207, 218, 227)

```tsx
disabled={verifyOtp.isPending || otp.length < 4}
```

The OTP is always 6 digits. The guard should be `otp.length < 6` to prevent premature submission. The test at line 158–170 (`VerifyOtpForm.test.tsx`) explicitly tests and _asserts_ the `< 4` threshold, meaning both the component and the test encode the wrong invariant.

---

### 🟢 Suggestions (nice to have)

#### S1. Input focus/blur handlers are duplicated across form components
`LoginForm.tsx` repeats inline `onFocus`/`onBlur` arrow functions on every `<input>`. `RegisterForm.tsx` correctly extracts them to `onFocus`/`onBlur` constants. `ForgotPasswordForm.tsx` and `VerifyOtpForm.tsx` go back to inline again. Standardise across all four forms — the `RegisterForm` pattern is the right one.

#### S2. `UserVerification.type` is a plain `String` — consider a typed enum
**File:** `activecity-api/…/cm/entity/UserVerification.java` (line 19)

```java
private String type;  // "REGISTRATION" | "PASSWORD_RESET"
```

The `AuthService` uses string constants `TYPE_REGISTRATION` and `TYPE_PASSWORD_RESET`. An enum (e.g. `VerificationType`) or at minimum a separate constants class would eliminate the risk of a typo silently breaking the lookup.

#### S3. `UserMapper.findById` is defined but never called
**File:** `activecity-api/…/pub/repository/UserMapper.java` (line 36–39)
**File:** `activecity-api/…/resources/mapper/pub/UserMapper.xml` (lines 49–57)

`findById` has both interface declaration and XML mapping but is unused in `AuthService`. Dead code should be removed or a comment should explain its intended use (e.g. "reserved for protected endpoints").

#### S4. `deleteExpired` has no scheduler wired
**File:** `activecity-api/…/pub/repository/UserVerificationMapper.java` (line 43–46)

The Javadoc says "intended to be called by a scheduled job" but there is no `@Scheduled` component anywhere in the codebase. Without a scheduler, expired OTP rows accumulate indefinitely. A follow-up ticket should be created, or the method comment should note the outstanding work.

#### S5. `application.yml` has `spring.jpa.open-in-view: false` but no JPA is used
**File:** `activecity-api/src/main/resources/application.yml` (line 18–19)

The project uses MyBatis, not JPA/Hibernate. The JPA stanza is harmless but adds noise. Remove it to keep the config minimal and avoid confusion.

#### S6. `verifyOtp` — OTP is compared with `equals()` on plain text; consider constant-time comparison
**File:** `activecity-api/…/pub/service/AuthService.java` (lines 173–174)

```java
if (!uv.getOtpCode().equals(req.getOtpCode())) {
```

For a 6-digit numeric OTP the timing difference is negligible, but a constant-time `MessageDigest.isEqual` comparison is the professionally defensible approach. Treat as a suggestion for compliance-sensitive environments.

#### S7. `AuthControllerTest` — `/pub/verify-otp` success has no expiry/wrong-code failure tests
**File:** `activecity-api/…/pub/controller/AuthControllerTest.java`

Only the `200 OK` path for `verifyOtp` is tested at the controller level. Adding a `verifyOtp_expiredOtp_returns400` and a `verifyOtp_wrongCode_returns400` would round out the controller slice coverage.

#### S8. Frontend test `useAuth.test.ts` — `useResetPassword` test payload uses wrong shape
**File:** `activecity-web/__tests__/hooks/useAuth.test.ts` (lines 294–297)

```ts
const payload = {
  token: "reset-token-abc",
  newPassword: "newpassword123",
  confirmPassword: "newpassword123",
};
```

This mirrors the incorrect `ResetPasswordPayload` type (see Critical Issue 2). Once the type is corrected this test payload also needs updating to `{ email, otpCode, newPassword, confirmPassword }`.

---

### ✅ What looks good

**Architecture compliance:**
- Controllers return `ResponseEntity<Object>` with zero business logic — fully compliant.
- No `@Valid` anywhere in the `pub/` layer — all validation is via `CommonValidator`.
- `JwtAuthFilter` has no `@Component` or `@Bean` annotation and is correctly registered with `addFilterBefore(new JwtAuthFilter(...), ...)` in `SecurityConfig`.
- No `${}` anywhere in either MyBatis XML mapper — only `#{}` used throughout.
- All error messages (except the one noted in W2) reference `CommonMessage` constants.
- Next.js API routes are all pure proxy handlers — no auth middleware required or applied.
- No Inter, Roboto, Arial, or Space Grotesk in any frontend file — `Plus_Jakarta_Sans` is used correctly.
- CSS custom properties are defined in `globals.css` and referenced via `var()` in component files (except the RGBA carve-outs noted in W7/W8).

**Security:**
- No hardcoded secrets anywhere — all sensitive values injected via environment variables.
- BCrypt is used for all password hashing and verification.
- JWT secret is validated at startup via `@PostConstruct` — the application will refuse to start with a weak secret.
- Login deliberately returns `INVALID_CREDENTIALS` for both "user not found" and "wrong password" to prevent email enumeration.
- `forgotPassword` silently succeeds for unknown emails — correct enumeration prevention.
- No sensitive data (passwords, OTP codes, tokens) is logged.

**Code quality:**
- `AuthService` is well-structured with consistent try/catch wrapping and `TransactionInterceptor.currentTransactionStatus().setRollbackOnly()` in every write path.
- All write methods are `@Transactional(rollbackFor = Exception.class)`.
- DTOs are clean POJOs with Lombok — no business logic leaking into them.
- `CommonValidator` is stateless, testable, and correctly reuses `requireNonBlank` inside `requireMinLength`.
- HTTP status codes are appropriate throughout: 409 for duplicate, 401 for credentials, 403 for inactive account, 404 for not found, 400 for validation/OTP errors.
- SQL schema is solid: correct FK with `ON DELETE CASCADE`, indexes on `user_id` and `(otp_code, type)`, `TIMESTAMPTZ` for all timestamps, `updated_at` trigger.
- MyBatis XML is clean, uses `resultMap` with explicit column mappings, `useGeneratedKeys="true"` for inserts.
- `WebConfig` CORS origin is injected from env — no hardcoded origin.

**Test quality:**
- Backend tests follow AAA rigorously and are clearly labelled.
- `CommonValidatorTest` uses `@ParameterizedTest` effectively — comprehensive edge-case coverage.
- `UserAuthProviderTest` correctly uses `ReflectionTestUtils` to inject `@Value` fields without Spring context and manually invokes `@PostConstruct`.
- `AuthServiceTest` handles the `TransactionInterceptor` static-call problem with `MockedStatic` — a non-trivial and correct solution.
- `AuthControllerTest` uses `@WebMvcTest` (correct slice) rather than `@SpringBootTest`.
- Frontend component tests use mocked hooks — tests are isolated and fast.
- `renderWithProviders` sets `retry: false` on the test `QueryClient` to prevent flaky async retries.
- `VerifyOtpForm.test.tsx` correctly uses `vi.useFakeTimers()` + `advanceTimers` for the redirect timeout test.
- `ForgotPasswordForm.test.tsx` tests both the success panel swap (form hidden) and the individual message display.
