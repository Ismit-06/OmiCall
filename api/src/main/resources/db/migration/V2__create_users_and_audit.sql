-- V2: Users, roles, preferences, and admin audit logging
-- Core user table
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    google_id       VARCHAR(255) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    role            VARCHAR(20)  NOT NULL DEFAULT 'ROLE_USER',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
    CONSTRAINT chk_user_role   CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_status    ON users(status);

-- User matching preferences
CREATE TABLE user_preferences (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gender           VARCHAR(20),
    preferred_gender VARCHAR(20),
    country          VARCHAR(100),
    language         VARCHAR(100),
    interests        TEXT,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Admin audit log (append-only)
CREATE TABLE admin_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    admin_id        BIGINT NOT NULL REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50),
    target_id       VARCHAR(255),
    reason          TEXT,
    details         TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_admin_id   ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_action     ON admin_audit_logs(action);
CREATE INDEX idx_audit_created_at ON admin_audit_logs(created_at);
