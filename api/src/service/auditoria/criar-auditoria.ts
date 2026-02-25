import type { Auditoria, NovaAuditoria } from "@/model/auditoria-model.js";
import { criarAuditoria } from "@/repositories/auditoria-repositories.js";
import { httpCriacao } from "@/util/http-util.js";

export async function criarAuditoriaService(dadosAuditoria: NovaAuditoria) {
	const auditoria = await criarAuditoria(dadosAuditoria);

	if (!auditoria) {
		throw new Error("Erro ao criar auditoria");
	}

	return httpCriacao<Auditoria>(auditoria);
}
