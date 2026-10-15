import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaCompraConfirmada,
	listarItensCompraConfirmadaAuditoria,
	listarMovimentosPorNotas,
} from "@/repositories/auditoria-entrada-nf-repositories.js";
import {
	montarAtualizacaoProdutoNf,
	type DadosProdutoNF,
} from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";
import { inteiroValidoParaPostgres } from "@/util/texto-util.js";

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
	contador?: number | null;
	descricao?: string | null;
	nomeProduto?: string | null;
	cestItem?: string | null;
	situacaotributariaItem?: string | null;
	cstpisItem?: string | null;
	cstcofinsItem?: string | null;
	cstipiItem?: string | null;
	cestProduto?: number | string | null;
	situacaotributariasnentradaProduto?: string | null;
	cstpisentradaProduto?: string | null;
	cstcofinsentradaProduto?: string | null;
	cstipientradaProduto?: string | null;
	idcfopsaidaProduto?: string | null;
	idcfopsaidanfceProduto?: string | null;
	situacaotributariaProduto?: string | null;
	cstpisProduto?: string | null;
	cstcofinsProduto?: string | null;
	ncmItem: string | null;
	idncmItem: string | null;
	idcfopItem: string | null;
	dadosimportacao: unknown;
	ncmProduto: string | null;
	idncmProduto: string | null;
	idcestProduto: string | null;
	idcfopentradaProduto: string | null;
	eanProduto: string | null;
	eantributavelProduto?: string | null;
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

/** Última casa de quantidadeentrada (numeric 15,6). */
export const TOLERANCIA_QUANTIDADE_ENTRADA = 0.000001;

export type SituacaoQuantidadeRevalidacao =
	| "quantidade_inserida"
	| "quantidade_divergente"
	| "sem_movimento"
	| "movimento_nota_sem_item";

export type SituacaoEanRevalidacao = "atualizado" | "divergente" | "nota_sem_ean";
export type SituacaoCestRevalidacao = "atualizado" | "divergente" | "nota_sem_cest";
export type SituacaoTributacaoEntradaRevalidacao =
	| "atualizada"
	| "divergente"
	| "nota_sem_dados";

export type InterpretacaoQuantidadeEntrada = {
	situacao: SituacaoQuantidadeRevalidacao;
	quantidadeEsperada: number | null;
	quantidadeMovimento: number | null;
};

export type InterpretacaoCadastroEntrada = {
	ean: SituacaoEanRevalidacao;
	cest: SituacaoCestRevalidacao;
	tributacaoEntrada: SituacaoTributacaoEntradaRevalidacao;
	camposTributacaoDivergentes: string[];
};

export type ItemRevalidacaoProdutosNota = {
	iditem: string;
	contador: number | null;
	descricao: string;
	idproduto: string;
	nomeProduto: string | null;
	quantidade: InterpretacaoQuantidadeEntrada;
	ean: SituacaoEanRevalidacao;
	cest: SituacaoCestRevalidacao;
	tributacaoEntrada: SituacaoTributacaoEntradaRevalidacao;
	camposTributacaoDivergentes: string[];
};

export type RevalidacaoProdutosNota = {
	somenteLeitura: true;
	idnotafiscal: string;
	numero: string | null;
	chavenfe: string | null;
	aviso: string;
	resumo: {
		itensComProduto: number;
		quantidadeOk: number;
		semMovimento: number;
		quantidadeDivergente: number;
		movimentoAmbiguo: number;
		eanDivergente: number;
		cestDivergente: number;
		tributacaoDivergente: number;
	};
	itens: ItemRevalidacaoProdutosNota[];
};

function somenteDigitos(valor: string | number | null | undefined): string {
	return String(valor ?? "").replace(/\D/g, "");
}

function lerTexto(valor: unknown): string | undefined {
	if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
	return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function lerDadosImportacao(valor: unknown): {
	idcest?: string;
	eanXml?: string;
	cestXml?: string;
	ncmXml?: string;
	idncm?: string;
	idcfop?: string;
	quantidadeEstoque?: string;
	situacaotributaria?: string;
	cstpis?: string;
	cstcofins?: string;
	cstipi?: string;
} {
	if (!valor || typeof valor !== "object") return {};
	const dados = valor as Record<string, unknown>;
	const tributacao =
		dados.tributacao && typeof dados.tributacao === "object"
			? (dados.tributacao as Record<string, unknown>)
			: {};
	return {
		idcest: lerTexto(dados.idcest),
		eanXml: lerTexto(dados.eanXml),
		cestXml: lerTexto(dados.cestXml),
		ncmXml: lerTexto(dados.ncmXml),
		idncm: lerTexto(dados.idncm),
		idcfop: lerTexto(dados.idcfop),
		quantidadeEstoque: lerTexto(dados.quantidadeEstoque),
		situacaotributaria: lerTexto(tributacao.situacaotributaria),
		cstpis: lerTexto(tributacao.cstpis),
		cstcofins: lerTexto(tributacao.cstcofins),
		cstipi: lerTexto(tributacao.cstipi),
	};
}

export function movimentosAtivosEntrada(
	movimentos: MovimentoAuditoriaEntrada[],
): MovimentoAuditoriaEntrada[] {
	return movimentos.filter((movimento) => {
		if (movimento.cancelado === 1) return false;
		const quantidade = Number.parseFloat(movimento.quantidadeentrada ?? "0");
		return Number.isFinite(quantidade) && quantidade > 0;
	});
}

export function classificarEstoqueItem(
	iditem: string,
	movimentos: MovimentoAuditoriaEntrada[],
): ClassificacaoEstoqueEntrada {
	const ativos = movimentosAtivosEntrada(movimentos);

	if (ativos.some((movimento) => movimento.iditemoriginal === iditem)) {
		return "movimento_item";
	}
	if (ativos.some((movimento) => !movimento.iditemoriginal)) {
		return "movimento_nota_sem_item";
	}
	return "sem_movimento";
}

export function quantidadeEsperadaEntrada(item: ItemAuditoriaEntrada): number | null {
	const dados = lerDadosImportacao(item.dadosimportacao);
	const texto = (dados.quantidadeEstoque ?? item.quantidade ?? "").replace(",", ".");
	const quantidade = Number.parseFloat(texto);
	if (!texto.trim() || !Number.isFinite(quantidade)) return null;
	return quantidade;
}

export function interpretarQuantidadeEntrada(
	item: ItemAuditoriaEntrada,
	movimentos: MovimentoAuditoriaEntrada[],
): InterpretacaoQuantidadeEntrada {
	const classificacao = classificarEstoqueItem(item.iditem, movimentos);
	const quantidadeEsperada = quantidadeEsperadaEntrada(item);

	if (classificacao === "movimento_nota_sem_item") {
		return {
			situacao: "movimento_nota_sem_item",
			quantidadeEsperada,
			quantidadeMovimento: null,
		};
	}

	if (classificacao === "sem_movimento") {
		return {
			situacao: "sem_movimento",
			quantidadeEsperada,
			quantidadeMovimento: 0,
		};
	}

	const quantidadeMovimento = movimentosAtivosEntrada(movimentos)
		.filter((movimento) => movimento.iditemoriginal === item.iditem)
		.reduce((total, movimento) => {
			return total + Number.parseFloat(movimento.quantidadeentrada ?? "0");
		}, 0);

	const cobre =
		quantidadeEsperada != null &&
		Math.abs(quantidadeMovimento - quantidadeEsperada) <=
			TOLERANCIA_QUANTIDADE_ENTRADA;

	return {
		situacao: cobre ? "quantidade_inserida" : "quantidade_divergente",
		quantidadeEsperada,
		quantidadeMovimento,
	};
}

function textoNota(valor: string | null | undefined): string {
	return valor?.trim() ?? "";
}

export function interpretarCadastroEntrada(
	item: ItemAuditoriaEntrada,
): InterpretacaoCadastroEntrada {
	const dados = lerDadosImportacao(item.dadosimportacao);
	const eanNota = somenteDigitos(dados.eanXml);
	const codigoBarrasProduto = somenteDigitos(item.eanProduto);
	const codigoBarrasTributavel = somenteDigitos(item.eantributavelProduto);
	const ean: SituacaoEanRevalidacao = !eanNota
		? "nota_sem_ean"
		: eanNota === codigoBarrasProduto && eanNota === codigoBarrasTributavel
			? "atualizado"
			: "divergente";

	const idcestNota = textoNota(dados.idcest);
	const cestNota = somenteDigitos(item.cestItem ?? dados.cestXml);
	let cest: SituacaoCestRevalidacao = "nota_sem_cest";
	if (idcestNota || cestNota) {
		const idConfere = Boolean(idcestNota) && idcestNota === textoNota(item.idcestProduto);
		const codigoConfere =
			Boolean(cestNota) && cestNota === somenteDigitos(item.cestProduto);
		cest = idConfere || codigoConfere ? "atualizado" : "divergente";
	}

	const campos: string[] = [];
	let comparouTributacao = false;
	const conferir = (
		rotulo: string,
		nota: string | null | undefined,
		produto: string | null | undefined,
		digitos = false,
	) => {
		const valorNota = digitos ? somenteDigitos(nota) : textoNota(nota);
		if (!valorNota) return;
		comparouTributacao = true;
		const valorProduto = digitos ? somenteDigitos(produto) : textoNota(produto);
		if (valorNota !== valorProduto) campos.push(rotulo);
	};

	conferir("NCM", item.ncmItem ?? dados.ncmXml, item.ncmProduto, true);
	conferir("NCM vinculado", item.idncmItem ?? dados.idncm, item.idncmProduto);
	conferir(
		"CFOP de entrada",
		item.idcfopItem ?? dados.idcfop,
		item.idcfopentradaProduto,
	);
	conferir(
		"CST/CSOSN de entrada",
		item.situacaotributariaItem ?? dados.situacaotributaria,
		item.situacaotributariasnentradaProduto,
	);
	conferir(
		"PIS de entrada",
		item.cstpisItem ?? dados.cstpis,
		item.cstpisentradaProduto,
	);
	conferir(
		"COFINS de entrada",
		item.cstcofinsItem ?? dados.cstcofins,
		item.cstcofinsentradaProduto,
	);
	conferir(
		"IPI de entrada",
		item.cstipiItem ?? dados.cstipi,
		item.cstipientradaProduto,
	);

	const tributacaoEntrada: SituacaoTributacaoEntradaRevalidacao = !comparouTributacao
		? "nota_sem_dados"
		: campos.length > 0
			? "divergente"
			: "atualizada";

	return { ean, cest, tributacaoEntrada, camposTributacaoDivergentes: campos };
}

export function completarCodigoBarrasDosItens<
	T extends { contador?: number | null; dadosimportacao: unknown },
>(itens: T[], xml: string | null | undefined): T[] {
	if (!xml?.trim()) return itens;

	let codigos: string[] = [];
	try {
		codigos = parseNFeXml(xml).itens.map((itemXml) => itemXml.ean ?? "");
	} catch {
		return itens;
	}

	return itens.map((item) => {
		const dadosAtuais =
			item.dadosimportacao && typeof item.dadosimportacao === "object"
				? (item.dadosimportacao as Record<string, unknown>)
				: {};
		if (somenteDigitos(lerTexto(dadosAtuais.eanXml))) return item;

		const codigo = codigos[(item.contador ?? 0) - 1] ?? "";
		if (!codigo) return item;

		return {
			...item,
			dadosimportacao: {
				...dadosAtuais,
				eanXml: codigo,
			},
		};
	});
}

function omitirIndefinidos<T extends Record<string, unknown>>(dados: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(dados).filter(([, valor]) => valor !== undefined),
	) as Partial<T>;
}

const CAMPOS_CADASTRO_ENTRADA = new Set([
	"ean",
	"eantributavel",
	"idcest",
	"ncm",
	"idncm",
	"idcfopentrada",
	"situacaotributariasnentrada",
	"cstpisentrada",
	"cstcofinsentrada",
	"cstipientrada",
]);

export function montarPatchCadastroRevalidacao(
	item: ItemAuditoriaEntrada,
	opcoes?: { idcfopsaidaSugerido?: string | null | undefined },
): { patch: Partial<NovoProduto>; campos: string[] } {
	const dados = lerDadosImportacao(item.dadosimportacao);
	const cadastro = interpretarCadastroEntrada(item);
	const entrada: DadosProdutoNF = { idempresa: "revalidacao" };
	const campos: string[] = [];

	if (cadastro.ean === "divergente" && dados.eanXml) {
		entrada.ean = somenteDigitos(dados.eanXml);
		campos.push("Código de barras");
	}

	if (cadastro.cest === "divergente" && dados.idcest) {
		entrada.idcest = dados.idcest;
		campos.push("CEST");
	}

	const divergentes = new Set(cadastro.camposTributacaoDivergentes);
	if (divergentes.has("NCM")) {
		entrada.ncm = item.ncmItem ?? dados.ncmXml;
		campos.push("NCM");
	}
	if (divergentes.has("NCM vinculado")) {
		entrada.idncm = item.idncmItem ?? dados.idncm;
		campos.push("NCM vinculado");
	}
	if (divergentes.has("CFOP de entrada")) {
		entrada.idcfopentrada = item.idcfopItem ?? dados.idcfop;
		campos.push("CFOP de entrada");
	}
	if (divergentes.has("CST/CSOSN de entrada")) {
		entrada.situacaotributariaentrada =
			item.situacaotributariaItem ?? dados.situacaotributaria;
		campos.push("CST/CSOSN de entrada");
	}
	if (divergentes.has("PIS de entrada")) {
		entrada.cstpisentrada = item.cstpisItem ?? dados.cstpis;
		campos.push("PIS de entrada");
	}
	if (divergentes.has("COFINS de entrada")) {
		entrada.cstcofinsentrada = item.cstcofinsItem ?? dados.cstcofins;
		campos.push("COFINS de entrada");
	}
	if (divergentes.has("IPI de entrada")) {
		entrada.cstipientrada = item.cstipiItem ?? dados.cstipi;
		campos.push("IPI de entrada");
	}

	const bruto = montarAtualizacaoProdutoNf({
		...entrada,
		idcfopsaida: undefined,
		idcfopsaidanfce: undefined,
		cfopvendaecf: undefined,
		situacaotributaria: undefined,
		situacaotributariasn: undefined,
		tributacaoespecial: undefined,
		tributacaosn: undefined,
		cstpis: undefined,
		cstcofins: undefined,
		cstipisaida: undefined,
		quantidadepadrao: undefined,
		preco: undefined,
		custoaquisicao: undefined,
		fatorconversao: undefined,
	});

	const patch = omitirIndefinidos(
		Object.fromEntries(
			Object.entries(bruto).filter(([chave, valor]) => {
				return CAMPOS_CADASTRO_ENTRADA.has(chave) && valor !== undefined;
			}),
		),
	) as Partial<NovoProduto>;

	if (cadastro.cest === "divergente") {
		const codigo = somenteDigitos(item.cestItem ?? dados.cestXml);
		const cestInteiro = inteiroValidoParaPostgres(
			codigo ? Number(codigo) : undefined,
		);
		if (cestInteiro != null) {
			patch.cest = cestInteiro;
			if (!campos.includes("CEST")) campos.push("CEST");
		}
	}

	const idcfopsaidaSugerido = opcoes?.idcfopsaidaSugerido?.trim();
	if (idcfopsaidaSugerido && !textoNota(item.idcfopsaidaProduto)) {
		patch.idcfopsaida = idcfopsaidaSugerido;
		campos.push("CFOP de saída");
	}
	if (idcfopsaidaSugerido && !textoNota(item.idcfopsaidanfceProduto)) {
		patch.idcfopsaidanfce = idcfopsaidaSugerido;
	}

	return { patch, campos };
}

export type DecisaoEstoqueRevalidacao = {
	lancar: boolean;
	resultado: "lancado" | "ja_inserido" | "nao_corrigido";
	motivo: string;
};

export function decidirLancamentoEstoqueRevalidacao(
	quantidade: InterpretacaoQuantidadeEntrada,
): DecisaoEstoqueRevalidacao {
	if (quantidade.situacao === "quantidade_inserida") {
		return {
			lancar: false,
			resultado: "ja_inserido",
			motivo: "A quantidade desta nota já foi inserida no estoque.",
		};
	}

	if (quantidade.situacao === "quantidade_divergente") {
		return {
			lancar: false,
			resultado: "nao_corrigido",
			motivo:
				"O movimento existe, mas a quantidade difere da nota. O estoque não foi lançado de novo para não dobrar o saldo.",
		};
	}

	if (quantidade.situacao === "movimento_nota_sem_item") {
		return {
			lancar: false,
			resultado: "nao_corrigido",
			motivo:
				"Há movimento desta nota sem vínculo do item. O estoque não foi lançado de novo para não dobrar o saldo.",
		};
	}

	if (quantidade.quantidadeEsperada == null || quantidade.quantidadeEsperada <= 0) {
		return {
			lancar: false,
			resultado: "nao_corrigido",
			motivo: "A nota não tem quantidade de entrada válida para lançar estoque.",
		};
	}

	return {
		lancar: true,
		resultado: "lancado",
		motivo: "Entrada de estoque lançada para este item.",
	};
}

function divergenciasFiscaisItem(item: ItemAuditoriaEntrada): string[] {
	const cadastro = interpretarCadastroEntrada(item);
	const divergencias = [...cadastro.camposTributacaoDivergentes];
	if (cadastro.ean === "divergente") divergencias.push("ean");
	if (cadastro.cest === "divergente") divergencias.push("cest");
	return divergencias;
}

export function montarRevalidacaoProdutosNota(
	nota: { id: string; numero: string | null; numeronotafiscal: string | null; chavenfe: string | null },
	itens: ItemAuditoriaEntrada[],
	movimentos: MovimentoAuditoriaEntrada[],
): RevalidacaoProdutosNota {
	const daNota = movimentos.filter((movimento) => movimento.idoriginal === nota.id);
	const interpretados = itens
		.filter((item) => item.idproduto)
		.map((item) => {
			const quantidade = interpretarQuantidadeEntrada(item, daNota);
			const cadastro = interpretarCadastroEntrada(item);
			return {
				iditem: item.iditem,
				contador: item.contador ?? null,
				descricao: item.descricao?.trim() || "Item sem descrição",
				idproduto: item.idproduto,
				nomeProduto: item.nomeProduto ?? null,
				quantidade,
				ean: cadastro.ean,
				cest: cadastro.cest,
				tributacaoEntrada: cadastro.tributacaoEntrada,
				camposTributacaoDivergentes: cadastro.camposTributacaoDivergentes,
			};
		});

	const resumo = {
		itensComProduto: interpretados.length,
		quantidadeOk: 0,
		semMovimento: 0,
		quantidadeDivergente: 0,
		movimentoAmbiguo: 0,
		eanDivergente: 0,
		cestDivergente: 0,
		tributacaoDivergente: 0,
	};

	for (const item of interpretados) {
		if (item.quantidade.situacao === "quantidade_inserida") resumo.quantidadeOk += 1;
		if (item.quantidade.situacao === "sem_movimento") resumo.semMovimento += 1;
		if (item.quantidade.situacao === "quantidade_divergente") {
			resumo.quantidadeDivergente += 1;
		}
		if (item.quantidade.situacao === "movimento_nota_sem_item") {
			resumo.movimentoAmbiguo += 1;
		}
		if (item.ean === "divergente") resumo.eanDivergente += 1;
		if (item.cest === "divergente") resumo.cestDivergente += 1;
		if (item.tributacaoEntrada === "divergente") resumo.tributacaoDivergente += 1;
	}

	return {
		somenteLeitura: true,
		idnotafiscal: nota.id,
		numero: nota.numero ?? nota.numeronotafiscal,
		chavenfe: nota.chavenfe,
		aviso:
			"Somente leitura. Não altera estoque nem cadastro. A comparação fiscal é a tributação de entrada gravada na finalização. CST de saída válido do produto não entra nesta revalidação.",
		resumo,
		itens: interpretados,
	};
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

export async function revalidarProdutosNotaConfirmadaService(params: {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
}): Promise<HttpResponse<RevalidacaoProdutosNota>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	const nota = await buscarNotaCompraConfirmada(
		params.idempresa,
		params.idnotafiscal,
	);
	if (!nota) {
		return httpNaoEncontrado("Nota de compra confirmada não encontrada");
	}

	const itens = completarCodigoBarrasDosItens(
		await listarItensCompraConfirmadaAuditoria({
			idempresa: params.idempresa,
			idnotafiscal: params.idnotafiscal,
			limit: 500,
		}),
		nota.arquivoxmlnotaoriginal,
	);
	const movimentos = await listarMovimentosPorNotas([params.idnotafiscal]);

	return httpOk(
		montarRevalidacaoProdutosNota(
			nota,
			itens.map((item) => ({
				...item,
				idproduto: item.idproduto ?? "",
			})),
			movimentos,
		),
	);
}
