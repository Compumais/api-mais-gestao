ALTER TABLE contamesaitem ADD COLUMN IF NOT EXISTS pago smallint NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contamesaitem_pago ON contamesaitem(idcontamesa, pago);
