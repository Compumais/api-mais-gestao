import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarItensCompraConfirmadaAuditoria,
	listarMovimentosPorNotas,
} from "@/repositories/auditoria-entrada-nf-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type ClassificacaoEstoqueEntrada =
	| "movimento_item"
	| "movimento_nota_sem_item"
	| "sem_movimento";

export type AcaoSugeridaAuditoriaEntrada =
	| "corrigir_cadastro_fiscal"
	| "lancar_estoque_apos_conferencia"
	| "nao_lancar_estoque";

export type MovimentoAuditoriaEntrada = {
	idoriginal: string | null;
	iditemoriginal: string | null;
	quantidadeentrada: string | null;
	cancelado: number | null;
};

export type ItemAuditoriaEntrada = {
	idnotafiscal: string;
	numero: string | null;
	numeronotafiscal: string | null;
	chavenfe: string | null;
	iditem: string;
	idproduto: string;
	quantidade: string | null;
	ncmItem: string | null;
	idncmItem: string | null;
	idcfopItem: string | null;
	dadosimportacao: unknown;
	ncmProduto: string | null;
	idncmProduto: string | null;
	idcestProduto: string | null;
	idcfopentradaProduto: string | null;
	eanProduto: string | null;
	quantidadepadrao: number | null;
};

export type DivergenciaAuditoriaEntrada = {
	idnotafiscal: string;
	numero: string | null;
	chavenfe: string | null;
	iditem: string;
	idproduto: string;
	quantidadeItem: string | null;
	classificacaoEstoque: ClassificacaoEstoqueEntrada;
	divergenciasFiscais: string[];
	quantidadepadrao: number | null;
	acoesSugeridas: AcaoSugeridaAuditoriaEntrada[];
};

export type RelatorioAuditoriaEntrada = {
	somenteLeitura: true;
	aviso: string;
	resumo: {
		itensAnalisados: number;
		divergencias: number;
		semMovimento: number;
		movimentoNotaSemItem: number;
		divergenciaFiscal: number;
	};
	itens: DivergenciaAuditoriaEntrada[];
};

function somenteDigitos(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

function lerTexto(valor: unknown): string | undefined {
	return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function lerDadosImportacao(valor: unknown): {
	idcest?: string;
	eanXml?: string;
	ncmXml?: string;
	idncm?: string;
	idcfop?: string;
} {
	if (!valor || typeof valor !== "object") return {};
	const dados = valor as Record<string, unknown>;
	return {
		idcest: lerTexto(dados.idcest),
		eanXml: lerTexto(dados.eanXml),
		ncmXml: lerTexto(dados.ncmXml),
		idncm: lerTexto(dados.idncm),
		idcfop: lerTexto(dados.idcfop),
	};
}

export function classificarEstoqueItem(
	iditem: string,
	movimentos: MovimentoAuditoriaEntrada[],
): ClassificacaoEstoqueEntrada {
	const ativos = movimentos.filter((movimento) => {
		if (movimento.cancelado === 1) return false;
		const quantidade = Number.parseFloat(movimento.quantidadeentrada ?? "0");
		return Number.isFinite(quantidade) && quantidade > 0;
	});

	if (ativos.some((movimento) => movimento.iditemoriginal === iditem)) {
		return "movimento_item";
	}
	if (ativos.some((movimento) => !movimento.iditemoriginal)) {
		return "movimento_nota_sem_item";
	}
	return "sem_movimento";
}

function divergenciasFiscaisItem(item: ItemAuditoriaEntrada): string[] {
	const dados = lerDadosImportacao(item.dadosimportacao);
	const divergencias: string[] = [];

	const ncmNota = somenteDigitos(item.ncmItem ?? dados.ncmXml);
	const ncmProduto = somenteDigitos(item.ncmProduto);
	if (ncmNota && ncmNota !== ncmProduto) divergencias.push("ncm");

	const idncmNota = item.idncmItem ?? dados.idncm ?? "";
	if (idncmNota && idncmNota !== (item.idncmProduto ?? "")) {
		divergencias.push("idncm");
	}

	const idcfopNota = item.idcfopItem ?? dados.idcfop ?? "";
	if (idcfopNota && idcfopNota !== (item.idcfopentradaProduto ?? "")) {
		divergencias.push("idcfopentrada");
	}

	if (dados.idcest && dados.idcest !== (item.idcestProduto ?? "")) {
		divergencias.push("idcest");
	}

	const eanNota = somenteDigitos(dados.eanXml);
	const eanProduto = somenteDigitos(item.eanProduto);
	if (eanNota && eanNota !== eanProduto) divergencias.push("ean");

	return divergencias;
}

export function montarRelatorioAuditoriaEntrada(
	itens: ItemAuditoriaEntrada[],
	movimentos: MovimentoAuditoriaEntrada[],
): RelatorioAuditoriaEntrada {
	const porNota = new Map<string, MovimentoAuditoriaEntrada[]>();
	for (const movimento of movimentos) {
		if (!movimento.idoriginal) continue;
		const lista = porNota.get(movimento.idoriginal) ?? [];
		lista.push(movimento);
		porNota.set(movimento.idoriginal, lista);
	}

	const divergencias: DivergenciaAuditoriaEntrada[] = [];
	let semMovimento = 0;
	let movimentoNotaSemItem = 0;
	let divergenciaFiscal = 0;

	for (const item of itens) {
		if (!item.idproduto) continue;
		const classificacao = classificarEstoqueItem(
			item.iditem,
			porNota.get(item.idnotafiscal) ?? [],
		);
		const fiscais = divergenciasFiscaisItem(item);
		if (classificacao === "movimento_item" && fiscais.length === 0) continue;

		if (classificacao === "sem_movimento") semMovimento += 1;
		if (classificacao === "movimento_nota_sem_item") movimentoNotaSemItem += 1;
		if (fiscais.length > 0) divergenciaFiscal += 1;

		const acoesSugeridas: AcaoSugeridaAuditoriaEntrada[] = [];
		if (fiscais.length > 0) acoesSugeridas.push("corrigir_cadastro_fiscal");
		if (classificacao === "sem_movimento") {
			acoesSugeridas.push("lancar_estoque_apos_conferencia");
		}
		if (classificacao !== "sem_movimento") {
			acoesSugeridas.push("nao_lancar_estoque");
		}

		divergencias.push({
			idnotafiscal: item.idnotafiscal,
			numero: item.numero ?? item.numeronotafiscal,
			chavenfe: item.chavenfe,
			iditem: item.iditem,
			idproduto: item.idproduto,
			quantidadeItem: item.quantidade,
			classificacaoEstoque: classificacao,
			divergenciasFiscais: fiscais,
			quantidadepadrao: item.quantidadepadrao,
			acoesSugeridas,
		});
	}

	return {
		somenteLeitura: true,
		aviso:
			"Relatório somente leitura. quantidadepadrao é inteiro e não é o saldo. Não lance estoque de novo quando classificacaoEstoque for movimento_item ou movimento_nota_sem_item.",
		resumo: {
			itensAnalisados: itens.length,
			divergencias: divergencias.length,
			semMovimento,
			movimentoNotaSemItem,
			divergenciaFiscal,
		},
		itens: divergencias,
	};
}

export async function auditarEntradaNfConfirmadaService(params: {
	idusuario: string;
	idempresa: string;
	limit?: number | undefined;
}): Promise<HttpResponse<RelatorioAuditoriaEntrada>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	const limit = Math.min(Math.max(params.limit ?? 200, 1), 500);
	const itens = await listarItensCompraConfirmadaAuditoria({
		idempresa: params.idempresa,
		limit,
	});
	const idsNotas = [...new Set(itens.map((item) => item.idnotafiscal))];
	const movimentos = await listarMovimentosPorNotas(idsNotas);

	return httpOk(
		montarRelatorioAuditoriaEntrada(
			itens.map((item) => ({
				...item,
				idproduto: item.idproduto ?? "",
			})),
			movimentos,
		),
	);
}
