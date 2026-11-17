import { sql } from "drizzle-orm";
import { db } from "../../../../repositories/connection.js";
import type { CnabFile } from "../../domain/entities/cnab_file.entity.js";

type CnabFileRow = {
	id: string;
	empresa_id: string;
	slip_id: string;
	filename: string;
	content: Buffer;
	created_at: Date;
	updated_at: Date;
};

function rowsOf<T>(result: unknown): T[] {
	if (result && typeof result === "object" && "rows" in result) {
		const rows = (result as { rows?: unknown }).rows;
		if (Array.isArray(rows)) return rows as T[];
	}
	return (Array.isArray(result) ? result : []) as T[];
}

function mapRow(row: CnabFileRow): CnabFile {
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

export class CnabFileRepository {
	async create(
		data: Omit<CnabFile, "id" | "createdAt" | "updatedAt">,
	): Promise<CnabFile> {
		const result = await db.execute(sql`
			INSERT INTO cnab_files (empresa_id, slip_id, filename, content)
			VALUES (${data.empresaId}, ${data.slipId}, ${data.filename}, ${data.content})
			RETURNING id, empresa_id, slip_id, filename, content, created_at, updated_at;
		`);
		const row = rowsOf<CnabFileRow>(result)[0];
		if (!row) {
			throw new Error("Falha ao gravar arquivo CNAB");
		}
		return mapRow(row);
	}

	async findBySlip(slipId: string): Promise<CnabFile[]> {
		const result = await db.execute(sql`
			SELECT * FROM cnab_files WHERE slip_id = ${slipId};
		`);
		return rowsOf<CnabFileRow>(result).map(mapRow);
	}

	async deleteOlderThan(days: number): Promise<void> {
		await db.execute(sql`
			DELETE FROM cnab_files
			WHERE created_at < now() - (${days}::int * interval '1 day');
		`);
	}
}
