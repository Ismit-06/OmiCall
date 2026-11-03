-- V4: Matchmaking queue, matches, blocks, and reports
CREATE TABLE matches (
    id              BIGSERIAL PRIMARY KEY,
    user_one_id     BIGINT NOT NULL REFERENCES users(id),
    user_two_id     BIGINT NOT NULL REFERENCES users(id),
    livekit_room    VARCHAR(100) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at        TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_match_status CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED'))
);

CREATE INDEX idx_matches_u1 ON matches(user_one_id);
CREATE INDEX idx_matches_u2 ON matches(user_two_id);
CREATE INDEX idx_matches_status ON matches(status);

CREATE TABLE blocks (
    id              BIGSERIAL PRIMARY KEY,
    blocker_id      BIGINT NOT NULL REFERENCES users(id),
    blocked_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_block_pair UNIQUE (blocker_id, blocked_user_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);

CREATE TABLE reports (
    id               BIGSERIAL PRIMARY KEY,
    reporter_id      BIGINT NOT NULL REFERENCES users(id),
    reported_user_id BIGINT NOT NULL REFERENCES users(id),
    match_id         BIGINT REFERENCES matches(id),
    reason           TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    moderator_notes  TEXT,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_report_status CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'))
);

CREATE INDEX idx_reports_status   ON reports(status);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
