-- Test-payment orders and quota grants only. Never store chat text, raw IPs, or payment credentials.
CREATE TABLE IF NOT EXISTS demo_payment_orders (
  order_id TEXT PRIMARY KEY,
  ip_bucket TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount = 1000),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_demo_orders_ip_expiry
  ON demo_payment_orders(ip_bucket, expires_at);

CREATE TABLE IF NOT EXISTS demo_payment_grants (
  payment_key_hash TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  ip_bucket TEXT NOT NULL,
  day TEXT NOT NULL,
  extra_uses INTEGER NOT NULL CHECK (extra_uses = 10),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_grants_ip_day
  ON demo_payment_grants(ip_bucket, day);
CREATE INDEX IF NOT EXISTS idx_demo_grants_expiry
  ON demo_payment_grants(expires_at);
