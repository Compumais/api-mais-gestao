import type { Auditoria, NovaAuditoria } from "@/model/auditoria-model";
import { criarAuditoria } from "@/repositories/auditoria-repositories";
import { httpCriacao } from "@/util/http-util";

export async function criarAuditoriaService(dadosAuditoria: NovaAuditoria) {
	const auditoria = await criarAuditoria(dadosAuditoria);

	if (!auditoria) {
		throw new Error("Erro ao criar auditoria");
	}

	return httpCriacao<Auditoria>(auditoria);
}
