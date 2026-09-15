import { randomUUID } from "node:crypto";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarClientesAnalytics,
	buscarClientesRfm,
	buscarComparativoFlexivel,
	buscarDreAvancado,
	buscarExecutivoDashboard,
	buscarFinanceiroSaude,
	buscarFluxoCaixa,
	buscarInsights,
	buscarMatrizProdutos,
	buscarRentabilidade,
	buscarTopProdutosAvancado,
	buscarVendasAvancadas,
	buscarVendasPorDiaSemana,
	buscarVendasPorHora,
	type ClientesAnalytics,
	type ClientesRfmResposta,
	type ComparativoFlexivelModo,
	type ComparativoFlexivelResposta,
	type DreAvancadoResposta,
	type ExecutivoDashboard,
	type FinanceiroSaude,
	type FluxoCaixaResposta,
	type InsightItem,
	type MatrizProdutoItem,
	type RankingOrdenacao,
	type RentabilidadeResposta,
	type TopProdutoAvancado,
	type VendaPorDiaSemanaItem,
	type VendaPorHoraItem,
	type VendasAvancadas,
} from "@/repositories/dashboard-analytics-repositories.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import {
	atualizarMeta,
	buscarMetaPorId,
	buscarMetasAcompanhamento,
	criarMeta,
	excluirMeta,
	listarMetas,
	type MetaAcompanhamento,
	type MetaDashboard,
	type TipoMetaDashboard,
} from "@/repositories/metas-dashboard-repositories.js";
import {
	type PeriodoPreset,
	resolvePeriodo,
} from "@/util/dashboard-periodo.js";
import {
	httpCriacao,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
	httpSemConteudo,
} from "@/util/http-util.js";

type ParametrosBase = {
	idusuario: string;
	idempresa?: string;
};

type ParametrosPeriodoService = ParametrosBase & {
	preset?: PeriodoPreset;
	dataInicio?: string;
	dataFim?: string;
	dias?: number;
};

async function resolverEmpresaId(
	idusuario: string,
	idempresa?: string,
): Promise<string | null> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
		return null;
	}

	const empresaId = idempresa || idempresas[0];

	if (!empresaId || !idempresas.includes(empresaId)) {
		return null;
	}

	return empresaId;
}

function periodoDeParams(params: ParametrosPeriodoService) {
	return resolvePeriodo({
		preset: params.preset,
		dataInicio: params.dataInicio,
		dataFim: params.dataFim,
		dias: params.dias,
	});
}

export async function buscarExecutivoDashboardService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<ExecutivoDashboard>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarExecutivoDashboard({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		periodoAnterior: periodo.periodoAnterior,
		periodoYoY: periodo.periodoYoY,
	});

	return httpOk(dados);
}

export async function buscarVendasAvancadasService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<VendasAvancadas>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarVendasAvancadas({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		periodoAnterior: periodo.periodoAnterior,
	});

	return httpOk(dados);
}

export async function buscarVendasPorHoraService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<VendaPorHoraItem[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarVendasPorHora({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarVendasPorDiaSemanaService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<VendaPorDiaSemanaItem[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarVendasPorDiaSemana({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarTopProdutosAvancadoService(
	params: ParametrosPeriodoService & {
		ordenacao?: RankingOrdenacao;
		limit?: number;
	},
): Promise<HttpResponse<TopProdutoAvancado[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarTopProdutosAvancado({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		ordenacao: params.ordenacao,
		limit: params.limit,
	});

	return httpOk(dados);
}

export async function buscarMatrizProdutosService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<MatrizProdutoItem[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarMatrizProdutos({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarFinanceiroSaudeService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<FinanceiroSaude>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarFinanceiroSaude({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarFluxoCaixaService(
	params: ParametrosPeriodoService & {
		modo?: "historico" | "projetado";
		horizonteDias?: number;
	},
): Promise<HttpResponse<FluxoCaixaResposta>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarFluxoCaixa({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		modo: params.modo,
		horizonteDias: params.horizonteDias,
	});

	return httpOk(dados);
}

export async function buscarDreAvancadoService(
	params: ParametrosBase & {
		granularidade?: "ano" | "trimestre" | "mes";
		ano?: number;
		mes?: number;
		trimestre?: number;
	},
): Promise<HttpResponse<DreAvancadoResposta>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const dados = await buscarDreAvancado({
		idempresa: empresaId,
		granularidade: params.granularidade,
		ano: params.ano,
		mes: params.mes,
		trimestre: params.trimestre,
	});

	return httpOk(dados);
}

export async function buscarComparativoFlexivelService(
	params: ParametrosPeriodoService & {
		modo: ComparativoFlexivelModo;
		dataInicioB?: string;
		dataFimB?: string;
	},
): Promise<HttpResponse<ComparativoFlexivelResposta>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarComparativoFlexivel({
		idempresa: empresaId,
		modo: params.modo,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		dataInicioBStr: params.dataInicioB,
		dataFimBStr: params.dataFimB,
	});

	return httpOk(dados);
}

export async function buscarRentabilidadeService(
	params: ParametrosPeriodoService & {
		dimensao?: "produto" | "categoria";
	},
): Promise<HttpResponse<RentabilidadeResposta>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarRentabilidade({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		dimensao: params.dimensao,
	});

	return httpOk(dados);
}

export async function buscarClientesAnalyticsService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<ClientesAnalytics>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarClientesAnalytics({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarClientesRfmService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<ClientesRfmResposta>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarClientesRfm({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
	});

	return httpOk(dados);
}

export async function buscarInsightsService(
	params: ParametrosPeriodoService,
): Promise<HttpResponse<InsightItem[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const periodo = periodoDeParams(params);
	const dados = await buscarInsights({
		idempresa: empresaId,
		dataInicioStr: periodo.dataInicioStr,
		dataFimStr: periodo.dataFimStr,
		periodoAnterior: periodo.periodoAnterior,
	});

	return httpOk(dados);
}

/* -------------------------------------------------------------------------- */
/*                                   METAS                                    */
/* -------------------------------------------------------------------------- */

export async function listarMetasDashboardService(
	params: ParametrosBase,
): Promise<HttpResponse<MetaDashboard[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const metas = await listarMetas({ idempresa: empresaId });
	return httpOk(metas);
}

export async function criarMetaDashboardService(params: {
	idusuario: string;
	idempresa: string;
	tipo: TipoMetaDashboard;
	periodoInicio: string;
	periodoFim: string;
	valorMeta: string;
}): Promise<HttpResponse<MetaDashboard>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const agora = new Date().toISOString();
	const meta = await criarMeta({
		id: randomUUID(),
		idempresa: empresaId,
		tipo: params.tipo,
		periodoInicio: params.periodoInicio,
		periodoFim: params.periodoFim,
		valorMeta: params.valorMeta,
		criadoem: agora,
		atualizadoem: agora,
	});

	return httpCriacao(meta);
}

export async function atualizarMetaDashboardService(params: {
	idusuario: string;
	idempresa?: string;
	id: string;
	tipo?: TipoMetaDashboard;
	periodoInicio?: string;
	periodoFim?: string;
	valorMeta?: string;
}): Promise<HttpResponse<MetaDashboard>> {
	const metaExistente = await buscarMetaPorId(params.id);
	if (!metaExistente) return httpNaoEncontrado();

	const empresaId = await resolverEmpresaId(
		params.idusuario,
		params.idempresa ?? metaExistente.idempresa,
	);
	if (!empresaId || empresaId !== metaExistente.idempresa) {
		return httpNaoAutorizado();
	}

	const meta = await atualizarMeta(params.id, empresaId, {
		...(params.tipo && { tipo: params.tipo }),
		...(params.periodoInicio && { periodoInicio: params.periodoInicio }),
		...(params.periodoFim && { periodoFim: params.periodoFim }),
		...(params.valorMeta && { valorMeta: params.valorMeta }),
		atualizadoem: new Date().toISOString(),
	});

	if (!meta) return httpNaoEncontrado();
	return httpOk(meta);
}

export async function excluirMetaDashboardService(params: {
	idusuario: string;
	idempresa?: string;
	id: string;
}): Promise<HttpResponse<null>> {
	const metaExistente = await buscarMetaPorId(params.id);
	if (!metaExistente) return httpNaoEncontrado();

	const empresaId = await resolverEmpresaId(
		params.idusuario,
		params.idempresa ?? metaExistente.idempresa,
	);
	if (!empresaId || empresaId !== metaExistente.idempresa) {
		return httpNaoAutorizado();
	}

	const meta = await excluirMeta(params.id, empresaId);
	if (!meta) return httpNaoEncontrado();

	return httpSemConteudo();
}

export async function buscarMetasAcompanhamentoService(
	params: ParametrosBase,
): Promise<HttpResponse<MetaAcompanhamento[]>> {
	const empresaId = await resolverEmpresaId(params.idusuario, params.idempresa);
	if (!empresaId) return httpNaoAutorizado();

	const dados = await buscarMetasAcompanhamento({ idempresa: empresaId });
	return httpOk(dados);
}
