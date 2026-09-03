PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS support_tickets(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  order_id INTEGER,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  category TEXT NOT NULL CHECK(category IN ('order','shipping','payment','return','product','account','other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pending_customer','pending_team','resolved','closed')),
  channel TEXT NOT NULL DEFAULT 'web' CHECK(channel IN ('web','line','email','phone','social','other')),
  subject TEXT NOT NULL,
  access_code_hash TEXT NOT NULL,
  assigned_staff_id INTEGER,
  sla_first_response_due_at TEXT,
  sla_resolution_due_at TEXT,
  first_response_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY(assigned_staff_id) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  author_type TEXT NOT NULL CHECK(author_type IN ('customer','staff','system')),
  customer_id INTEGER,
  staff_user_id INTEGER,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','internal')),
  channel TEXT NOT NULL DEFAULT 'web' CHECK(channel IN ('web','line','email','phone','social','other')),
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_ticket_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  staff_user_id INTEGER,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_satisfaction(
  ticket_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_created ON support_tickets(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority ON support_tickets(status,priority,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_staff_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created ON support_messages(ticket_id,created_at,id);
CREATE INDEX IF NOT EXISTS idx_support_events_ticket_created ON support_ticket_events(ticket_id,created_at,id);
