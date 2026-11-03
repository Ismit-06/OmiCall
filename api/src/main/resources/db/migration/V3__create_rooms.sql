-- V3: Private rooms and room participants
CREATE TABLE rooms (
    id              BIGSERIAL PRIMARY KEY,
    room_code       VARCHAR(20) NOT NULL UNIQUE,
    host_id         BIGINT NOT NULL REFERENCES users(id),
    password_hash   VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    max_participants INT NOT NULL DEFAULT 2,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_room_status CHECK (status IN ('WAITING', 'ACTIVE', 'FULL', 'CLOSED', 'EXPIRED'))
);

CREATE INDEX idx_rooms_code    ON rooms(room_code);
CREATE INDEX idx_rooms_host    ON rooms(host_id);
CREATE INDEX idx_rooms_status  ON rooms(status);
CREATE INDEX idx_rooms_expires ON rooms(expires_at);

CREATE TABLE room_participants (
    id        BIGSERIAL PRIMARY KEY,
    room_id   BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id   BIGINT NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at   TIMESTAMP WITH TIME ZONE,

    CONSTRAINT uq_room_active_participant UNIQUE (room_id, user_id)
);

CREATE INDEX idx_rp_room ON room_participants(room_id);
CREATE INDEX idx_rp_user ON room_participants(user_id);
