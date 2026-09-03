PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS support_channel_contacts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('line','email','social','phone','other')),
  external_contact_id TEXT NOT NULL,
  display_name TEXT,
  destination TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  UNIQUE(ticket_id,channel,external_contact_id)
);

CREATE TABLE IF NOT EXISTS support_external_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER,
  channel TEXT NOT NULL CHECK(channel IN ('line','email','social','phone','other')),
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound','status')),
  payload_json TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE SET NULL,
  UNIQUE(channel,external_event_id)
);

CREATE TABLE IF NOT EXISTS support_outbox(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('line','email','social','phone','other')),
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  next_attempt_at TEXT,
  last_error TEXT,
  external_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY(message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
  UNIQUE(message_id,channel)
);

CREATE INDEX IF NOT EXISTS idx_support_channel_contacts_lookup ON support_channel_contacts(channel,external_contact_id);
CREATE INDEX IF NOT EXISTS idx_support_external_events_ticket ON support_external_events(ticket_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_external_events_channel_created ON support_external_events(channel,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_outbox_delivery ON support_outbox(status,next_attempt_at,created_at);
CREATE INDEX IF NOT EXISTS idx_support_outbox_ticket ON support_outbox(ticket_id,created_at DESC);
