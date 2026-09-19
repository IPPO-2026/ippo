-- Request counters only. Do not add chat text, IP addresses or user profiles.
CREATE TABLE IF NOT EXISTS request_budget (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count >= 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_request_budget_expiry ON request_budget(expires_at);
