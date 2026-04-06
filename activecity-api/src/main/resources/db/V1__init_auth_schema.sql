-- ============================================================
-- V1__init_auth_schema.sql
-- ActiveCity Staff Portal — Initial Auth Schema
-- ============================================================

-- -------------------------------------------------------
-- Table: users
-- -------------------------------------------------------
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255)  UNIQUE NOT NULL,
    password_hash TEXT          NOT NULL,
    full_name     VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'STAFF',
    is_active     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ            DEFAULT now(),
    updated_at    TIMESTAMPTZ            DEFAULT now()
);

-- -------------------------------------------------------
-- Table: user_verifications
-- -------------------------------------------------------
CREATE TABLE user_verifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code   VARCHAR(10)  NOT NULL,
    type       VARCHAR(30)  NOT NULL,   -- 'REGISTRATION' | 'PASSWORD_RESET'
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT now()
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------
CREATE INDEX idx_user_verifications_user_id
    ON user_verifications(user_id);

CREATE INDEX idx_user_verifications_otp_type
    ON user_verifications(otp_code, type);

-- -------------------------------------------------------
-- updated_at auto-update trigger for users
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_users_updated_at();
