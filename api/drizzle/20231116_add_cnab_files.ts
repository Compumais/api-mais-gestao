import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type Banco = Pick<NodePgDatabase, "execute">;

/** Usa o banco recebido; sem parâmetro, cai na conexão padrão da API. */
async function resolverBanco(banco?: Banco): Promise<Banco> {
	if (banco) return banco;
	const { db } = await import("../src/repositories/connection.js");
	return db;
}

export async function up(banco?: Banco): Promise<void> {
	const db = await resolverBanco(banco);
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

export async function down(banco?: Banco): Promise<void> {
	const db = await resolverBanco(banco);
	await db.execute(sql`DROP TABLE IF EXISTS cnab_files;`);
}
