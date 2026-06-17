import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "./relations.js";
import * as schema from "./schema.js";

dotenv.config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema, ...relations });

async function clean() {
	try {
		console.log("🧹 Iniciando limpeza do banco de dados...");

		// Ordem de exclusão respeitando foreign keys
		// Primeiro excluir tabelas dependentes (filhas)

		console.log("🗑️  Limpando financeirolancamento...");
		await db.delete(schema.financeirolancamento);

		console.log("🗑️  Limpando contacorrentelancamento...");
		await db.delete(schema.contacorrentelancamento);

		console.log("🗑️  Limpando financeiro...");
		await db.delete(schema.financeiro);

		console.log("🗑️  Limpando entidade...");
		await db.delete(schema.entidade);

		console.log("🗑️  Limpando contacorrente...");
		await db.delete(schema.contacorrente);

		// Plano de contas tem auto-referência, então precisa limpar recursivamente
		console.log("🗑️  Limpando planocontas...");
		// Primeiro limpar referências circulares
		await db.execute(
			sql`UPDATE planocontas SET "idplanocontas" = NULL WHERE "idplanocontas" IS NOT NULL`,
		);
		await db.delete(schema.planocontas);

		console.log("🗑️  Limpando tipodocumentofinanceiro...");
		await db.delete(schema.tipodocumentofinanceiro);

		console.log("🗑️  Limpando motivobaixafinanceiro...");
		await db.delete(schema.motivobaixafinanceiro);

		console.log("🗑️  Limpando usuario_empresas...");
		await db.delete(schema.usuarioEmpresa);

		console.log("🗑️  Limpando audit_logs...");
		await db.delete(schema.auditLogs);

		console.log("🗑️  Limpando sessoes...");
		await db.delete(schema.sessoes);

		console.log("🗑️  Limpando contas...");
		await db.delete(schema.contas);

		console.log("🗑️  Limpando empresas...");
		await db.delete(schema.empresa);

		console.log("🗑️  Limpando usuarios...");
		await db.delete(schema.usuarios);

		console.log("🗑️  Limpando verificacoes...");
		await db.delete(schema.verificacoes);

		console.log("🗑️  Limpando unidades de medida...");
		await db.delete(schema.unidademedida);

		console.log("🗑️  Limpando bancos...");
		await db.delete(schema.banco);

		console.log("✅ Limpeza concluída com sucesso!");
	} catch (error) {
		console.error("❌ Erro ao executar limpeza:", error);
		throw error;
	} finally {
		await pool.end();
	}
}

clean();
