-- Initial baseline migration
CREATE TABLE IF NOT EXISTS schema_version_check (
    id SERIAL PRIMARY KEY,
    initialized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
