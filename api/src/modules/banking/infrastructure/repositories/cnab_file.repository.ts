import { db } from "@/repositories/connection.js";
import { sql } from "drizzle-orm";
import type { CnabFile } from "../../domain/entities/cnab_file.entity.js";

export class CnabFileRepository {
  async create(data: Omit<CnabFile, "id" | "createdAt" | "updatedAt">): Promise<CnabFile> {
    const result = await db.execute(sql`
      INSERT INTO cnab_files (empresa_id, slip_id, filename, content)
      VALUES (${data.empresaId}, ${data.slipId}, ${data.filename}, ${data.content})
      RETURNING id, empresa_id, slip_id, filename, content, created_at, updated_at;
    `);
    const rows = (result.rows ?? result) as any[];
    const row = rows[0];
    return {
      id: row.id,
      empresaId: row.empresa_id,
      slipId: row.slip_id,
      filename: row.filename,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findBySlip(slipId: string): Promise<CnabFile[]> {
    const result = await db.execute(sql`
      SELECT * FROM cnab_files WHERE slip_id = ${slipId};
    `);
    const rows = (result.rows ?? result) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      empresaId: row.empresa_id,
      slipId: row.slip_id,
      filename: row.filename,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteOlderThan(days: number): Promise<void> {
    await db.execute(sql`
      DELETE FROM cnab_files WHERE created_at < now() - (${days} || ' days')::interval;
    `);
  }
}
