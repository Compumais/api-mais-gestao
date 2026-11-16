import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarContratos } from "@/repositories/contrato-repositories.js";
import { buscarContratoCobrancaPorContratoCompetencia } from "@/repositories/contrato-cobranca-repositories.js";
import {
	avaliarPendenciasContrato,
	type ItemElegibilidadeContrato,
	parseCompetencia,
} from "@/util/contrato-faturamento-util.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";

type ListarElegiveisParametros = {
	idempresa: string;
	idusuario: string;
	competencia: string;
	somenteElegiveis?: boolean;
};

export async function listarContratosElegiveisFaturamentoService({
	idempresa,
	idusuario,
	competencia,
	somenteElegiveis = false,
}: ListarElegiveisParametros): Promise<
	HttpResponse<{ competencia: string; itens: ItemElegibilidadeContrato[] }>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	if (!parseCompetencia(competencia)) {
		return httpBadRequest("Competência inválida. Use o formato YYYY-MM");
	}

	const { contratos } = await listarContratos({
		idempresa,
		page: 1,
		limit: 500,
	});

	const itens: ItemElegibilidadeContrato[] = [];
	for (const contrato of contratos) {
		const cobrancaExistente = await buscarContratoCobrancaPorContratoCompetencia(
			idempresa,
			contrato.id,
			competencia,
		);
		const item = avaliarPendenciasContrato({
			contrato,
			competencia,
			cobrancaExistente: cobrancaExistente
				? {
						id: cobrancaExistente.id,
						statusfaturamento: cobrancaExistente.statusfaturamento,
					}
				: null,
		});
		if (!somenteElegiveis || item.elegivel) {
			itens.push(item);
		}
	}

	return httpOk({ competencia, itens });
}
