import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Empresa = typeof schema.empresa.$inferSelect;
export type NovaEmpresa = typeof schema.empresa.$inferInsert;

export async function criarEmpresa(dadosEmpresa: NovaEmpresa) {
	const empresa = await db
		.insert(schema.empresa)
		.values(dadosEmpresa)
		.returning();

	return empresa;
}
