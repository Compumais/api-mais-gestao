import type { NovaAuditoria } from "@/model/auditoria-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection";

export async function criarAuditoria(dadosAuditoria: NovaAuditoria) {
	const [auditoria] = await db
		.insert(schema.auditLogs)
		.values(dadosAuditoria)
		.returning();

	return auditoria;
}
