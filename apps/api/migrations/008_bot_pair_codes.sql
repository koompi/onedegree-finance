-- Bot pairing codes: links a Telegram ID to an existing web-app user
CREATE TABLE IF NOT EXISTS bot_pair_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bot_pair_codes_code ON bot_pair_codes(code);
CREATE INDEX IF NOT EXISTS idx_bot_pair_codes_user ON bot_pair_codes(user_id);
