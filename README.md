# ActiveCity Staff Portal

Internal portal for city government employees — authentication scaffold with OTP-verified registration, JWT login, and forgot/reset password flows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.4, Java 17, MyBatis 3.0.3 |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Auth | Spring Security + BCrypt (backend) · Supabase SSR (frontend session) · auth0 java-jwt 4.4.0 |
| Database | PostgreSQL 15+ |
| Testing | JUnit 5 + Spring Boot Test (backend) · Vitest + Testing Library (frontend) |

---

## Prerequisites

- Java 17 (LTS)
- Node.js 20 (LTS) with pnpm
- PostgreSQL 15+
- Maven Wrapper (`mvnw`) is committed — no global Maven installation required

---

## Getting Started

### 1. Clone

```bash
git clone <repository-url>
cd activecity-staff-portal
```

### 2. Apply the database schema

```bash
psql -U postgres -d activecity_db -f activecity-api/src/main/resources/db/V1__init_auth_schema.sql
```

### 3. Backend

```bash
cd activecity-api
cp .env.example .env
# Fill in real values — see Environment Variables table below
./mvnw spring-boot:run
```

The API will start on `http://localhost:8080`.

### 4. Frontend

```bash
cd activecity-web
cp .env.example .env
# Fill in real values — see Environment Variables table below
pnpm install
pnpm dev
```

The web app will start on `http://localhost:3000`.

---

## Environment Variables

### Backend (`activecity-api/.env`)

| Variable | Description | Example |
|---|---|---|
| `DB_URL` | JDBC URL for the PostgreSQL instance | `jdbc:postgresql://localhost:5432/activecity_db` |
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `JWT_SECRET` | HMAC256 signing secret — minimum 32 characters | `openssl rand -base64 48` |
| `JWT_EXPIRY_HOURS` | JWT lifetime in hours (default: `8`) | `8` |
| `MAIL_HOST` | SMTP server hostname | `smtp.sendgrid.net` |
| `MAIL_PORT` | SMTP port (STARTTLS) | `587` |
| `MAIL_USERNAME` | SMTP login username | `apikey` |
| `MAIL_PASSWORD` | SMTP password or API key | — |
| `CORS_ALLOWED_ORIGIN` | Allowed frontend origin (default: `http://localhost:3000`) | `http://localhost:3000` |

### Frontend (`activecity-web/.env`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | — |
| `API_BASE_URL` | Spring Boot API base URL — server-only, no `NEXT_PUBLIC_` prefix | `http://localhost:8080` |

> **Note:** The `.env.example` in the repo ships `NEXT_PUBLIC_API_BASE_URL`. Per security audit finding L-3, this should be renamed to `API_BASE_URL` (no `NEXT_PUBLIC_` prefix) since the value is only read server-side in Next.js Route Handlers.

---

## Project Structure

```
activecity-staff-portal/
├── activecity-api/                  # Spring Boot backend
│   ├── pom.xml
│   ├── .env.example
│   └── src/main/
│       ├── java/com/activecity/api/
│       │   ├── cm/                  # Shared utilities (ApiResponse, CommonMessage, validators, entities)
│       │   ├── config/              # Security, JWT, CORS configuration
│       │   └── pub/                 # Public (unauthenticated) feature package
│       │       ├── controller/      # AuthController
│       │       ├── dto/             # Request/response DTOs
│       │       ├── repository/      # MyBatis mapper interfaces
│       │       └── service/         # AuthService
│       └── resources/
│           ├── application.yml
│           ├── db/                  # Flyway-compatible SQL migration scripts
│           └── mapper/              # MyBatis XML mapper files
├── activecity-web/                  # Next.js frontend
│   ├── package.json
│   ├── middleware.ts                # Supabase session guard + route protection
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/                  # Auth pages (login, register, verify-otp, forgot-password)
│   │   └── api/auth/                # Next.js Route Handlers proxying to Spring Boot
│   ├── components/auth/             # Controlled form components
│   ├── hooks/                       # TanStack Query mutation hooks (useAuth.ts)
│   ├── types/                       # TypeScript interfaces
│   └── utils/supabase/              # Supabase browser + server clients
├── plans/                           # Implementation plan documents
└── reports/                         # Audit reports (security, code review)
```

---

## Key Conventions

These five rules are enforced across the entire codebase:

1. **No `@Valid` on `pub/` controllers.** All input validation is done in the service layer via `CommonValidator` static methods. `@Valid` / `@Validated` annotations must not appear on any `pub/` controller or DTO.

2. **All user-facing messages come from `CommonMessage`.** Never inline message strings in service or controller code. Always reference a constant in `com.activecity.api.cm.CommonMessage`.

3. **All SQL uses `#{}` parameter syntax.** No `${}` string interpolation is permitted in any MyBatis XML mapper file. All queries are parameterized.

4. **`JwtAuthFilter` is not a Spring bean.** It extends `OncePerRequestFilter` but carries no `@Component` annotation. It is instantiated manually inside `SecurityConfig.addFilterBefore(...)` to prevent double-registration.

5. **Font constraint — Plus Jakarta Sans only.** The frontend must never reference Inter, Roboto, Arial, or Space Grotesk. All font references go through CSS custom properties (`var(--font-display)` / `var(--font-body)`). No hardcoded hex values in component files; all design tokens live in `globals.css` `:root`.

---

## Running Tests

### Backend

```bash
cd activecity-api
./mvnw test
```

### Frontend

```bash
cd activecity-web
pnpm vitest run
```

---

## Agent Team

This project is built and maintained by a team of seven Claude Code agents. Each agent is triggered by a specific task type:

| Agent | Trigger / Responsibility |
|---|---|
| **db-agent** | Database schema changes — DDL migrations, index design, trigger functions |
| **backend-agent** | All Java/Spring Boot code — entities, services, controllers, security config, MyBatis mappers |
| **frontend-agent** | All Next.js/TypeScript code — pages, components, hooks, API routes, Tailwind styling |
| **security-auditor** | Security reviews — invoked after any auth-related change; produces findings in `reports/security/` |
| **code-reviewer** | Code quality reviews — invoked on pull requests; produces findings in `reports/code-review/` |
| **planner** | Phase planning — produces implementation plans in `plans/` before any new phase begins |
| **documenter** | Documentation — writes and updates `README.md`, `docs/api.md`, and `CLAUDE.md` from source code |
