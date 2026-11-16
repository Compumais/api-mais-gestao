import { db } from '../../../../../../../drizzle';
import { sql } from 'drizzle-orm';
import type { CnabFile } from '../domain/entities/cnab_file.entity';

export class CnabFileRepository {
  async create(data: Omit<CnabFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CnabFile> {
    const result = await db.run(sql`
      INSERT INTO cnab_files (empresa_id, slip_id, filename, content)
      VALUES (${data.empresaId}, ${data.slipId}, ${data.filename}, ${data.content})
      RETURNING id, empresa_id, slip_id, filename, content, created_at, updated_at;
    `);
    const row = result[0] as any;
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
    const rows = await db.run(sql`
      SELECT * FROM cnab_files WHERE slip_id = ${slipId};
    `);
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
    await db.run(sql`
      DELETE FROM cnab_files WHERE created_at < now() - interval '${days} days';
    `);
  }
}
