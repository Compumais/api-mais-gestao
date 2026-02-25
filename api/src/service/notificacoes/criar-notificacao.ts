import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	criarNotificacao,
	existeNotificacaoParaRecurso,
} from "@/repositories/notificacoes-repositories.js";
import { listarIdsUsuariosFinanceirosPorEmpresa } from "@/repositories/usuarios-repositories.js";
import { randomUUID } from "node:crypto";

export type TipoNotificacao =
	| "plano_contas"
	| "financeiro"
	| "financeiro_lancamento"
	| "conta_corrente_lancamento";

export type CriarNotificacaoParams = {
	tipo: TipoNotificacao;
	idempresa: string;
	idrecurso: string | null;
	titulo: string;
	detalhes?: Record<string, unknown>;
	idusuarioAutor: string;
	perfilAutor: string[];
};

function autorDeveNotificarProprietario(perfilAutor: string[]): boolean {
	return (
		perfilAutor.includes("user") || perfilAutor.includes("financeiro")
	);
}

function autorDeveNotificarFinanceiros(
	tipo: TipoNotificacao,
	perfilAutor: string[],
): boolean {
	return (
		tipo === "conta_corrente_lancamento" && perfilAutor.includes("user")
	);
}

export async function criarNotificacaoService(
	params: CriarNotificacaoParams,
): Promise<void> {
	const {
		tipo,
		idempresa,
		idrecurso,
		titulo,
		detalhes,
		idusuarioAutor,
		perfilAutor,
	} = params;

	const perfil = Array.isArray(perfilAutor) ? perfilAutor : [perfilAutor];

	try {
		const destinatarios = new Set<string>();

		if (autorDeveNotificarProprietario(perfil)) {
			const empresa = await buscarEmpresaPorId(idempresa);
			if (empresa?.idproprietario && empresa.idproprietario !== idusuarioAutor) {
				destinatarios.add(empresa.idproprietario);
			}
		}

		if (autorDeveNotificarFinanceiros(tipo, perfil)) {
			const idsFinanceiros =
				await listarIdsUsuariosFinanceirosPorEmpresa(idempresa);
			for (const id of idsFinanceiros) {
				if (id !== idusuarioAutor) {
					destinatarios.add(id);
				}
			}
		}

		for (const idusuario of destinatarios) {
			const jaExiste = await existeNotificacaoParaRecurso(
				idusuario,
				tipo,
				idrecurso,
			);
			if (jaExiste) continue;

			await criarNotificacao({
				id: randomUUID(),
				idusuario,
				idempresa,
				tipo,
				idrecurso,
				titulo,
				detalhes: detalhes ?? null,
				lida: false,
			});
		}
	} catch {
		// Não falhar a operação principal se a notificação falhar
	}
}
