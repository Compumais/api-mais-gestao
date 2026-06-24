import { randomUUID } from "node:crypto";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	criarNotificacao,
	existeNotificacaoParaRecurso,
} from "@/repositories/notificacoes-repositories.js";
import { listarIdsUsuariosFinanceirosPorEmpresa } from "@/repositories/usuarios-repositories.js";

export type TipoNotificacaoAgendada =
	| "alerta_agendado"
	| "alerta_vencimento"
	| "alerta_saldo_baixo"
	| "alerta_conciliacao"
	| "relatorio_automatico";

export type CriarNotificacaoAgendadaParams = {
	tipo: TipoNotificacaoAgendada;
	idempresa: string;
	idrecurso: string;
	titulo: string;
	detalhes?: Record<string, unknown>;
};

export async function criarNotificacaoAgendadaService(
	params: CriarNotificacaoAgendadaParams,
): Promise<number> {
	const destinatarios = new Set<string>();

	const empresa = await buscarEmpresaPorId(params.idempresa);
	if (empresa?.idproprietario) {
		destinatarios.add(empresa.idproprietario);
	}

	const idsFinanceiros =
		await listarIdsUsuariosFinanceirosPorEmpresa(params.idempresa);
	for (const id of idsFinanceiros) {
		destinatarios.add(id);
	}

	let criadas = 0;

	for (const idusuario of destinatarios) {
		const jaExiste = await existeNotificacaoParaRecurso(
			idusuario,
			params.tipo,
			params.idrecurso,
		);

		if (jaExiste) continue;

		await criarNotificacao({
			id: randomUUID(),
			idusuario,
			idempresa: params.idempresa,
			tipo: params.tipo,
			idrecurso: params.idrecurso,
			titulo: params.titulo,
			detalhes: params.detalhes ?? null,
			lida: false,
		});

		criadas++;
	}

	return criadas;
}
