import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error("DATABASE_URL não definida no .env");
		process.exit(1);
	}

	const pool = new Pool({ connectionString: databaseUrl });

	try {
		const colunasCsv = await pool.query<{ column_name: string }>(`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = 'produtos'
				AND column_name LIKE '%;%'
			ORDER BY column_name
		`);

		if (colunasCsv.rows.length === 0) {
			console.log("OK: nenhuma coluna CSV fantasma em produtos.");
			return;
		}

		for (const coluna of colunasCsv.rows) {
			const nome = coluna.column_name;
			const colunaSql = `"${nome.replace(/"/g, '""')}"`;
			console.log(`\nColuna fantasma: "${nome}"`);

			const stats = await pool.query<{
				total: string;
				com_valor_csv: string;
				com_nome: string;
				com_codigo: string;
			}>(
				`SELECT
					count(*)::text AS total,
					count(*) FILTER (
						WHERE ${colunaSql} IS NOT NULL
							AND trim(${colunaSql}::text) <> ''
					)::text AS com_valor_csv,
					count(*) FILTER (
						WHERE nome IS NOT NULL AND trim(nome) <> ''
					)::text AS com_nome,
					count(*) FILTER (WHERE codigo IS NOT NULL)::text AS com_codigo
				FROM produtos`,
			);

			const row = stats.rows[0];
			console.log(`  Total de produtos: ${row?.total ?? "0"}`);
			console.log(`  Com valor na coluna CSV: ${row?.com_valor_csv ?? "0"}`);
			console.log(`  Com nome preenchido: ${row?.com_nome ?? "0"}`);
			console.log(`  Com codigo preenchido: ${row?.com_codigo ?? "0"}`);

			const amostra = await pool.query<Record<string, unknown>>(
				`SELECT id, codigo, nome, referencia, ean, ${colunaSql} AS valor_csv
				FROM produtos
				WHERE ${colunaSql} IS NOT NULL
					AND trim(${colunaSql}::text) <> ''
				LIMIT 3`,
			);

			if (amostra.rows.length > 0) {
				console.log("  Amostra (3 registros):");
				for (const registro of amostra.rows) {
					console.log(
						`    - id=${registro.id} codigo=${registro.codigo} nome=${registro.nome}`,
					);
					console.log(`      valor_csv=${String(registro.valor_csv).slice(0, 120)}`);
				}
			}
		}

		console.log(
			"\nPróximo passo: pnpm run db:migrate (aplica 0028 e 0029 com segurança).",
		);
		console.log("Não use db:push em produção.");
	} finally {
		await pool.end();
	}
}

main().catch((erro) => {
	console.error(erro);
	process.exit(1);
});
