PRAGMA foreign_keys = ON;

ALTER TABLE creator_commissions ADD COLUMN payout_ref TEXT;
ALTER TABLE creator_commissions ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS return_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK(qty > 0),
  reason_code TEXT NOT NULL CHECK(reason_code IN ('damaged','wrong_item','not_as_described','other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','approved','rejected','cancelled','completed')),
  resolution_note TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  resolved_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_return_requests_customer ON return_requests(customer_id,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_product ON return_requests(order_id,product_id,status);
