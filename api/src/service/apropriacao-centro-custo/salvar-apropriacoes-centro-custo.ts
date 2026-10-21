import { v4 as uuidv4 } from "uuid";
import {
	REGIME_APROPRIACAO,
	type OrigemTipoApropriacao,
	type RegimeApropriacao,
} from "@/constants/centro-custo.js";
import type { LinhaApropriacaoInput } from "@/model/apropriacao-centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	excluirApropriacoesPorOrigem,
	inserirApropriacoes,
	listarApropriacoesPorOrigem,
} from "@/repositories/apropriacao-centro-custo-repositories.js";
import { buscarCentroCustoPorId } from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { db } from "@/repositories/connection.js";
import * as schema from "@/repositories/schema.js";
import { eq } from "drizzle-orm";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	arredondarMoeda,
	calcularTipoRateioCentroCusto,
	distribuirValoresPorPercentual,
	parseValorNumerico,
	validarSomaApropriacao,
} from "@/util/apropriacao-centro-custo-util.js";
import {
	httpErro,
	httpOk,
	httpProibido,
	httpBadRequest,
} from "@/util/http-util.js";
import { resolverContextoOrigemApropriacao } from "./resolver-origem-apropriacao.js";
import { validarOrcamentoCentroCusto } from "./validar-orcamento-centro-custo.js";

export type SalvarApropriacoesParametros = {
	idusuario: string;
	idempresa: string;
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime: RegimeApropriacao;
	linhas: LinhaApropriacaoInput[];
	idcriteriorateio?: string | null;
	referenciaexterna?: string | null;
	valorTotalManual?: number;
	datalancamentoManual?: string;
	idplanocontasManual?: string | null;
	auditoriaAcao?: string;
};

function normalizarLinhas(
	valorTotal: number,
	linhas: LinhaApropriacaoInput[],
): Array<{ idcentrocusto: string; valor: number; percentual: number | null }> {
	const todasComPercentual = linhas.every(
		(l) => l.percentual !== undefined && l.percentual !== null,
	);

	if (todasComPercentual) {
		return distribuirValoresPorPercentual(
			valorTotal,
			linhas.map((l) => ({
				idcentrocusto: l.idcentrocusto,
				percentual: parseValorNumerico(l.percentual),
			})),
		);
	}

	return linhas.map((l) => ({
		idcentrocusto: l.idcentrocusto,
		valor: arredondarMoeda(parseValorNumerico(l.valor)),
		percentual:
			l.percentual === undefined || l.percentual === null
				? null
				: parseValorNumerico(l.percentual),
	}));
}

async function atualizarFlagRateioOrigem(
	origemtipo: OrigemTipoApropriacao,
	origemid: string,
	tipoRateio: number | null,
) {
	if (origemtipo === "financeiro") {
		await db
			.update(schema.financeiro)
			.set({ tiporateiocentrocusto: tipoRateio })
			.where(eq(schema.financeiro.id, origemid));
		return;
	}
	if (origemtipo === "conta_corrente_lancamento") {
		await db
			.update(schema.contacorrentelancamento)
			.set({ tiporateiocentrocusto: tipoRateio })
			.where(eq(schema.contacorrentelancamento.id, origemid));
	}
}

export async function salvarApropriacoesCentroCustoService(
	params: SalvarApropriacoesParametros,
): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const linhasAntes = await listarApropriacoesPorOrigem({
		idempresa: params.idempresa,
		origemtipo: params.origemtipo,
		origemid: params.origemid,
		regime: params.regime,
	});

	const contexto = await resolverContextoOrigemApropriacao({
		origemtipo: params.origemtipo,
		origemid: params.origemid,
		regime: params.regime,
	});

	const valorTotal =
		params.valorTotalManual ??
		contexto?.valorTotal ??
		0;

	if (valorTotal <= 0 && params.linhas.length > 0) {
		return httpBadRequest("Valor total da origem inválido para rateio.");
	}

	if (
		contexto?.centroCustoObrigatorio &&
		params.linhas.length === 0 &&
		params.regime === REGIME_APROPRIACAO.COMPETENCIA
	) {
		return httpBadRequest(
			"Centro de custo obrigatório para a conta gerencial selecionada.",
		);
	}

	for (const linha of params.linhas) {
		const centro = await buscarCentroCustoPorId(linha.idcentrocusto);
		if (!centro || centro.idempresa !== params.idempresa) {
			return httpBadRequest("Centro de custo inválido.");
		}
	}

	const linhasNormalizadas =
		params.linhas.length > 0 ? normalizarLinhas(valorTotal, params.linhas) : [];

	const soma = arredondarMoeda(
		linhasNormalizadas.reduce((acc, l) => acc + l.valor, 0),
	);

	if (linhasNormalizadas.length > 0 && !validarSomaApropriacao(valorTotal, soma)) {
		return httpBadRequest(
			"A soma das apropriações deve corresponder ao valor total da despesa.",
		);
	}

	for (const linha of linhasNormalizadas) {
		const validacaoOrcamento = await validarOrcamentoCentroCusto({
			idempresa: params.idempresa,
			idcentrocusto: linha.idcentrocusto,
			regime: params.regime,
			valorIncremento: linha.valor,
			datalancamento:
				params.datalancamentoManual ??
				contexto?.datalancamento ??
				new Date().toISOString().slice(0, 10),
		});
		if (!validacaoOrcamento.ok) {
			return httpBadRequest(validacaoOrcamento.mensagem);
		}
	}

	await excluirApropriacoesPorOrigem({
		idempresa: params.idempresa,
		origemtipo: params.origemtipo,
		origemid: params.origemid,
		regime: params.regime,
	});

	const datalancamento: string =
		params.datalancamentoManual ??
		contexto?.datalancamento ??
		new Date().toISOString().slice(0, 10);

	const idplanocontas =
		params.idplanocontasManual ?? contexto?.idplanocontas ?? null;

	const inseridas = await inserirApropriacoes(
		linhasNormalizadas.map((linha) => ({
			id: uuidv4(),
			idempresa: params.idempresa,
			idcentrocusto: linha.idcentrocusto,
			origemtipo: params.origemtipo,
			origemid: params.origemid,
			valor: linha.valor.toFixed(2),
			percentual:
				linha.percentual === null ? null : linha.percentual.toFixed(2),
			idcriteriorateio: params.idcriteriorateio ?? null,
			regime: params.regime,
			datalancamento,
			idplanocontas: idplanocontas,
			referenciaexterna: params.referenciaexterna ?? null,
			idusuariocadastro: params.idusuario,
		})),
	);

	const tipoRateio = calcularTipoRateioCentroCusto(
		params.linhas,
		params.idcriteriorateio,
	);
	await atualizarFlagRateioOrigem(
		params.origemtipo,
		params.origemid,
		tipoRateio,
	);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: params.auditoriaAcao ?? "salvar_apropriacao_centro_custo",
		idusuario: params.idusuario,
		recurso: "apropriacao_centro_custo",
		idrecurso: params.origemid,
		idempresa: params.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			origemtipo: params.origemtipo,
			origemid: params.origemid,
			regime: params.regime,
			idcriteriorateio: params.idcriteriorateio ?? null,
			linhasAntes,
			linhasDepois: inseridas,
		},
	});

	if (params.linhas.length > 0 && inseridas.length === 0) {
		return httpErro();
	}

	return httpOk({ data: inseridas, valorTotal, soma });
}
