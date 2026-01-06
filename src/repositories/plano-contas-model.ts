import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type PlanoContas = typeof schema.planocontas.$inferSelect;
export type NovoPlanoContas = typeof schema.planocontas.$inferInsert;

export async function criarPlanoContas(dadosPlanoContas: NovoPlanoContas) {
	const planoContas = await db
		.insert(schema.planocontas)
		.values(dadosPlanoContas)
		.returning();

	return planoContas[0];
}
