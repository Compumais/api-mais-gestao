import { sql } from "drizzle-orm";
import { db } from "../src/repositories/connection.js";

export async function up() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cnab_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      slip_id UUID NOT NULL,
      filename TEXT NOT NULL,
      content BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cnab_files_empresa_idx ON cnab_files (empresa_id);
    CREATE INDEX IF NOT EXISTS cnab_files_slip_idx ON cnab_files (slip_id);
  `);
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS cnab_files;`);
}
