import { excluirAuditoria } from "@/repositories/auditoria-repositories.js";

export async function excluirAuditoriaService({ id }: { id: string }) {
	const auditoria = await excluirAuditoria({ id });

	return auditoria;
}
