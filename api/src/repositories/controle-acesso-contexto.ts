import { sql } from "drizzle-orm";
import { db } from "./connection.js";

type TransacaoDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function executarComControleAcessoPrivilegiado<T>(
	operacao: (tx: TransacaoDb) => Promise<T>,
): Promise<T> {
	return db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT set_config('app.controle_acesso_autorizado', 'true', true)`,
		);
		return operacao(tx);
	});
}
