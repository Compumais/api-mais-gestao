import { and, eq, sql } from "drizzle-orm";
import * as schema from "../../../drizzle/schema.js";
import { db } from "../../repositories/connection.js";

/**
 * Resolve e-mail a partir de e-mail ou nome de usuário.
 * Se o termo já tiver "@", devolve como está.
 * Se for nome, exige correspondência única entre usuários ativos.
 */
export async function resolverEmailLogin(
	identificador: string,
): Promise<string | null> {
	const termo = identificador.trim();
	if (!termo) return null;
	if (termo.includes("@")) return termo;

	const encontrados = await db
		.select({ email: schema.usuarios.email })
		.from(schema.usuarios)
		.where(
			and(
				eq(schema.usuarios.ativo, true),
				sql`lower(${schema.usuarios.nome}) = ${termo.toLowerCase()}`,
			),
		)
		.limit(2);

	if (encontrados.length !== 1) return null;
	return encontrados[0]?.email ?? null;
}
