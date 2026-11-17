import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type Banco = NodePgDatabase;

export async function up(db: Banco): Promise<void> {
	await db.execute(sql`
    CREATE TABLE cnab_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      slip_id UUID NOT NULL REFERENCES slip(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX cnab_files_empresa_idx ON cnab_files (empresa_id);
    CREATE INDEX cnab_files_slip_idx ON cnab_files (slip_id);
  `);
}

export async function down(db: Banco): Promise<void> {
	await db.execute(sql`DROP TABLE IF EXISTS cnab_files;`);
}
