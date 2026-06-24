import { db } from "@/repositories/connection.js";
import { normalizarConfiguracaoNotificacoes } from "@/worker/util/configuracao-notificacoes.js";
import * as schema from "../../../drizzle/schema.js";

export async function listarEmpresasComConfiguracaoNotificacoes() {
	const rows = await db
		.select({
			idempresa: schema.configuracoes.idempresa,
			notificacoes: schema.configuracoes.notificacoes,
		})
		.from(schema.configuracoes);

	return rows.map((row) => ({
		idempresa: row.idempresa,
		notificacoes: normalizarConfiguracaoNotificacoes(row.notificacoes),
	}));
}
