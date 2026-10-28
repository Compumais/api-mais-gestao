import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarSerieCompraVenda,
	buscarSerieEstoque,
	buscarSeriePrecoCusto,
	type PontoCompraVenda,
	type PontoEstoque,
	type PontoPrecoCusto,
} from "@/repositories/produto-analytics-repositories.js";
import { validarAcessoProduto } from "@/service/custo-produto/validar-acesso-produto.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

const MAX_DIAS = 365;

type ParamsBase = {
	idusuario: string;
	idproduto: string;
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

export function validarPeriodoAnalytics(
	dataInicio: string,
	dataFim: string,
): string | null {
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) ||
		!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)
	) {
		return "Data deve estar no formato YYYY-MM-DD";
	}
	const inicio = new Date(`${dataInicio}T00:00:00`);
	const fim = new Date(`${dataFim}T00:00:00`);
	if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
		return "Datas inválidas";
	}
	if (inicio > fim) {
		return "Data inicial não pode ser maior que data final";
	}
	const diffDays = Math.ceil(
		Math.abs(fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays > MAX_DIAS) {
		return `Período máximo permitido é de ${MAX_DIAS} dias`;
	}
	return null;
}

async function validarProdutoEmpresa(params: ParamsBase) {
	const acesso = await validarAcessoProduto(params.idusuario, params.idproduto);
	if (!acesso.sucesso) {
		return { ok: false as const, resposta: acesso.resposta };
	}
	const periodoErro = validarPeriodoAnalytics(
		params.dataInicio,
		params.dataFim,
	);
	if (periodoErro) {
		return {
			ok: false as const,
			resposta: httpBadRequest(periodoErro),
		};
	}
	// Usa a empresa do produto (já autorizada). Query idempresa divergente
	// não deve virar 400 — o gráfico ainda monta com a empresa real.
	return {
		ok: true as const,
		produto: acesso.produto,
		idempresa: acesso.produto.idempresa,
	};
}

export async function analyticsPrecoCustoService(
	params: ParamsBase,
): Promise<HttpResponse<{ pontos: PontoPrecoCusto[] } | null>> {
	const validacao = await validarProdutoEmpresa(params);
	if (!validacao.ok) {
		return validacao.resposta as HttpResponse<{
			pontos: PontoPrecoCusto[];
		} | null>;
	}

	try {
		const pontos = await buscarSeriePrecoCusto({
			idempresa: validacao.idempresa,
			idproduto: params.idproduto,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
		});
		return httpOk({ pontos });
	} catch (erro) {
		console.error("analyticsPrecoCustoService:", erro);
		return httpOk({ pontos: [] });
	}
}

export async function analyticsCompraVendaService(
	params: ParamsBase & { granularidade?: "dia" | "semana" | "mes" },
): Promise<HttpResponse<{ pontos: PontoCompraVenda[] } | null>> {
	const validacao = await validarProdutoEmpresa(params);
	if (!validacao.ok) {
		return validacao.resposta as HttpResponse<{
			pontos: PontoCompraVenda[];
		} | null>;
	}

	try {
		const pontos = await buscarSerieCompraVenda({
			idempresa: validacao.idempresa,
			idproduto: params.idproduto,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			granularidade: params.granularidade ?? "dia",
		});
		return httpOk({ pontos });
	} catch (erro) {
		console.error("analyticsCompraVendaService:", erro);
		return httpOk({ pontos: [] });
	}
}

export async function analyticsEstoqueService(
	params: ParamsBase & { tipoEstoque?: number },
): Promise<HttpResponse<{ pontos: PontoEstoque[] } | null>> {
	const validacao = await validarProdutoEmpresa(params);
	if (!validacao.ok) {
		return validacao.resposta as HttpResponse<{ pontos: PontoEstoque[] } | null>;
	}

	try {
		const pontos = await buscarSerieEstoque({
			idempresa: validacao.idempresa,
			idproduto: params.idproduto,
			dataInicio: params.dataInicio,
			dataFim: params.dataFim,
			tipoEstoque: params.tipoEstoque ?? 0,
		});
		return httpOk({ pontos });
	} catch (erro) {
		console.error("analyticsEstoqueService:", erro);
		return httpOk({ pontos: [] });
	}
}
