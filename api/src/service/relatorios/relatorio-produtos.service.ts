import type {
	ColunaRelatorioProdutos,
	FiltrosRelatorioProdutos,
	ResultadoRelatorioProdutos,
	TipoRelatorioProdutos,
} from "@/model/relatorio-produtos-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	consultarDisponibilidadePrecosProdutos,
	consultarRelatorioProdutos,
	consultarResumoQualidadeProdutos,
} from "@/repositories/relatorio-produtos-repositories.js";

export class ErroRelatorioProdutos extends Error {
	constructor(
		message: string,
		readonly status = 400,
	) {
		super(message);
	}
}

type DefinicaoRelatorio = {
	titulo: string;
	colunas: ColunaRelatorioProdutos[];
	avisos?: string[];
};

const c = (
	chave: string,
	label: string,
	tipo?: ColunaRelatorioProdutos["tipo"],
): ColunaRelatorioProdutos => ({ chave, label, ...(tipo ? { tipo } : {}) });

const definicoes: Record<TipoRelatorioProdutos, DefinicaoRelatorio> = {
	qualidade: {
		titulo: "Qualidade do cadastro de produtos",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("status", "Status"),
			c("pendencias", "Pendências"),
			c("estoque", "Estoque", "numero"),
			c("margem_percentual", "Margem %", "percentual"),
		],
	},
	cadastro: {
		titulo: "Cadastro de produtos",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Nome"),
			c("descricao", "Descrição"),
			c("ean", "EAN"),
			c("unidade", "Unidade"),
			c("grupo", "Grupo"),
			c("marca", "Marca"),
			c("fornecedor", "Fornecedor"),
			c("status", "Status"),
			c("cadastro", "Cadastro", "datahora"),
			c("alteracao", "Alteração", "data"),
			c("imagem", "Imagem"),
			c("duplicado", "Duplicado"),
		],
	},
	ean: {
		titulo: "Códigos EAN/GTIN",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("ean_principal", "EAN principal"),
			c("ean_tributavel", "EAN tributável"),
			c("eans_alternativos", "EANs alternativos"),
			c("situacao_ean", "Situação"),
			c("quantidade_duplicada", "Duplicidades", "numero"),
			c("quantidade_eans_alternativos", "Qtd. alternativos", "numero"),
		],
	},
	precos: {
		titulo: "Preços e margens",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("custo_aquisicao", "Custo aquisição", "moeda"),
			c("custo_medio", "Custo médio", "moeda"),
			c("preco_venda", "Venda", "moeda"),
			c("margem_reais", "Margem R$", "moeda"),
			c("margem_percentual", "Margem %", "percentual"),
			c("preco_ultima_compra", "Última compra", "moeda"),
			c("alteracao_preco", "Alteração", "data"),
			c("tabelas_preco", "Tabelas de preço"),
			c("precos_minimos", "Preços mínimos"),
			c("precos_promocionais", "Preços promocionais"),
		],
		avisos: [
			"Tabelas e promoções são estruturas opt-in; enquanto não houver gravação, o relatório usa o preço principal do produto.",
		],
	},
	estoque: {
		titulo: "Posição de estoque",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("unidade", "Un."),
			c("estoque_operacional", "Operacional", "numero"),
			c("estoque_fiscal", "Fiscal", "numero"),
			c("minimo", "Mínimo", "numero"),
			c("maximo", "Máximo", "numero"),
			c("custo_medio", "Custo médio", "moeda"),
			c("valor_estoque", "Valor", "moeda"),
			c("ultima_entrada", "Última entrada", "datahora"),
			c("ultima_saida", "Última saída", "datahora"),
			c("dias_sem_movimento", "Dias parado", "numero"),
		],
		avisos: [
			"Saldo legado é associado por idempresa + código textual do produto; saldoestoque.idproduto permanece bigint nesta entrega.",
		],
	},
	fiscal: {
		titulo: "Cadastro fiscal de produtos",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("ncm", "NCM"),
			c("cest", "CEST"),
			c("origem", "Origem"),
			c("cfop", "CFOP"),
			c("cst", "CST"),
			c("csosn", "CSOSN"),
			c("cstpis", "CST PIS"),
			c("aliquota_pis", "PIS %", "percentual"),
			c("cstcofins", "CST COFINS"),
			c("aliquota_cofins", "COFINS %", "percentual"),
			c("aliquota_ipi", "IPI %", "percentual"),
			c("cstibs", "CST IBS/CBS"),
			c("classificacao_ibs_cbs", "Classificação"),
			c("aliquota_ibs", "IBS %", "percentual"),
			c("aliquota_cbs", "CBS %", "percentual"),
			c("beneficio_fiscal", "Benefício"),
		],
		avisos: [
			"Os dados exibidos são defaults cadastrais. O relatório não infere aplicabilidade de ICMS-ST, DIFAL ou benefício fiscal para uma operação concreta.",
		],
	},
	comercial: {
		titulo: "Desempenho comercial por produto",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("quantidade", "Quantidade", "numero"),
			c("faturamento", "Faturamento", "moeda"),
			c("custo_estimado_atual", "Custo estimado atual", "moeda"),
			c("lucro", "Lucro", "moeda"),
			c("margem_percentual", "Margem %", "percentual"),
			c("ultima_venda", "Última venda", "datahora"),
		],
		avisos: [
			"Vendas PDV não possuem campo de cancelamento no schema atual; não foi aplicado um status inexistente. custo_estimado_atual usa o cadastro vigente, pois o item não possui snapshot de custo.",
		],
	},
	compras: {
		titulo: "Últimas compras por produto",
		colunas: [
			c("codigo", "Código"),
			c("nome", "Produto"),
			c("fornecedor", "Fornecedor"),
			c("ultima_compra", "Última compra", "datahora"),
			c("valor_unitario", "Valor unitário", "moeda"),
			c("frete", "Frete", "moeda"),
			c("desconto", "Desconto", "moeda"),
			c("custo_final", "Custo final", "moeda"),
			c("documento", "Documento"),
		],
		avisos: [
			"Quantidade comprada não existe em custoproduto; o relatório apresenta o histórico seguro de custos e o vínculo da nota quando disponível.",
		],
	},
	movimentacoes: {
		titulo: "Kardex de produtos",
		colunas: [
			c("data_hora", "Data/hora", "datahora"),
			c("codigo", "Código"),
			c("produto", "Produto"),
			c("origem", "Origem"),
			c("documento", "Documento"),
			c("tipo_estoque", "Estoque"),
			c("entrada", "Entrada", "numero"),
			c("saida", "Saída", "numero"),
			c("saldo_calculado", "Saldo calculado", "numero"),
			c("custo_aquisicao", "Custo aquisição", "moeda"),
			c("custo_medio", "Custo médio", "moeda"),
			c("lote", "Lote"),
			c("local", "Local"),
			c("observacao", "Observação"),
			c("cancelado", "Cancelado"),
		],
	},
	unidades: {
		titulo: "Unidades e conversões",
		colunas: [
			c("codigo", "Código"),
			c("produto", "Produto"),
			c("unidade", "Unidade"),
			c("descricao_unidade", "Descrição"),
			c("fator", "Fator", "numero"),
			c("fator_alternativo", "Fator alternativo", "numero"),
			c("fator_producao", "Fator produção", "numero"),
			c("conversoes", "Conversões cadastradas"),
			c("validade_fatores", "Validade"),
		],
		avisos: [
			"Conversões vinculadas são lidas de produto_unidade_conversao; fatorconversao legado permanece sem vínculo direto com produto.",
		],
	},
	composicao: {
		titulo: "Composição e ficha de produção",
		colunas: [
			c("tipo_composicao", "Tipo"),
			c("codigo_acabado", "Cód. acabado"),
			c("produto_acabado", "Produto acabado"),
			c("status_composicao", "Status"),
			c("codigo_componente", "Cód. componente"),
			c("componente", "Componente"),
			c("quantidade", "Quantidade", "numero"),
			c("custo_unitario", "Custo unitário", "moeda"),
			c("custo_componente", "Custo componente", "moeda"),
			c("estoque_componente", "Estoque", "numero"),
			c("observacao", "Observação"),
		],
	},
	auditoria: {
		titulo: "Auditoria de produtos",
		colunas: [
			c("data_hora", "Data/hora", "datahora"),
			c("acao", "Ação"),
			c("produto_id", "Produto"),
			c("usuario", "Usuário"),
			c("ip", "IP"),
			c("fonte", "Fonte"),
			c("antes", "Antes"),
			c("depois", "Depois"),
			c("metadados", "Metadados"),
		],
		avisos: [
			"IP é exibido para novos eventos de produto_historico; eventos legados de audit_logs permanecem sem IP.",
		],
	},
};

const filtrosPermitidos: Record<TipoRelatorioProdutos, ReadonlySet<string>> = {
	qualidade: new Set(["q", "situacao", "grupo", "fornecedor", "pendencia"]),
	cadastro: new Set(["q", "situacao", "grupo", "fornecedor", "pendencia"]),
	ean: new Set(["q", "situacao", "pendencia"]),
	precos: new Set([
		"q",
		"situacao",
		"grupo",
		"fornecedor",
		"margemMin",
		"margemMax",
	]),
	estoque: new Set([
		"q",
		"situacao",
		"grupo",
		"fornecedor",
		"pendencia",
		"diasSemMovimento",
	]),
	fiscal: new Set(["q", "situacao", "grupo", "fornecedor", "pendencia"]),
	comercial: new Set([
		"q",
		"situacao",
		"dataInicio",
		"dataFim",
		"margemMin",
		"margemMax",
	]),
	compras: new Set(["q", "situacao", "fornecedor", "dataInicio", "dataFim"]),
	movimentacoes: new Set([
		"q",
		"situacao",
		"dataInicio",
		"dataFim",
		"origem",
		"tipoEstoque",
	]),
	unidades: new Set(["q", "situacao", "pendencia"]),
	composicao: new Set(["q", "situacao", "pendencia"]),
	auditoria: new Set(["q", "dataInicio", "dataFim"]),
};

function validarFiltros(
	tipo: TipoRelatorioProdutos,
	filtros: FiltrosRelatorioProdutos,
) {
	const sempre = new Set(["idempresa", "page", "limit", "ordenarPor", "ordem"]);
	for (const [chave, valor] of Object.entries(filtros)) {
		if (
			valor !== undefined &&
			!sempre.has(chave) &&
			!filtrosPermitidos[tipo].has(chave)
		) {
			throw new ErroRelatorioProdutos(
				`O filtro "${chave}" não é aceito no relatório ${tipo}`,
			);
		}
	}
}

export function validarGtin(valor: string | null | undefined): boolean {
	if (!valor || !/^\d{8}$|^\d{12,14}$/.test(valor)) return false;
	const digitos = [...valor].map(Number);
	const informado = digitos.pop();
	let soma = 0;
	for (
		let i = digitos.length - 1, peso = 3;
		i >= 0;
		i--, peso = peso === 3 ? 1 : 3
	) {
		soma += (digitos[i] ?? 0) * peso;
	}
	return (10 - (soma % 10)) % 10 === informado;
}

function complementarValidacaoGtin(resultado: ResultadoRelatorioProdutos) {
	if (resultado.tipo !== "ean") return;
	for (const linha of resultado.data) {
		const ean = linha.ean_principal;
		if (typeof ean !== "string" || !ean.trim()) continue;
		if (linha.situacao_ean === "Duplicado") continue;
		linha.situacao_ean = validarGtin(ean) ? "Válido" : "Dígito inválido";
	}
}

export async function gerarRelatorioProdutos(params: {
	tipo: TipoRelatorioProdutos;
	filtros: FiltrosRelatorioProdutos;
	idusuario: string;
}): Promise<ResultadoRelatorioProdutos> {
	validarFiltros(params.tipo, params.filtros);
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.filtros.idempresa,
	);
	if (!pertence)
		throw new ErroRelatorioProdutos("Usuário não pertence à empresa", 403);

	const [consulta, resumoQualidade, disponibilidadePrecos] = await Promise.all([
		consultarRelatorioProdutos(params.tipo, params.filtros),
		params.tipo === "qualidade"
			? consultarResumoQualidadeProdutos(params.filtros)
			: Promise.resolve(undefined),
		params.tipo === "precos"
			? consultarDisponibilidadePrecosProdutos(params.filtros.idempresa)
			: Promise.resolve(undefined),
	]);
	const definicao = definicoes[params.tipo];
	const avisos = [...(definicao.avisos ?? [])];
	if (disponibilidadePrecos?.tabelas === 0) {
		avisos.push("Não há itens de tabela de preço cadastrados para a empresa.");
	}
	if (disponibilidadePrecos?.promocoes === 0) {
		avisos.push("Não há preços promocionais cadastrados para a empresa.");
	}
	const resultado: ResultadoRelatorioProdutos = {
		tipo: params.tipo,
		titulo: definicao.titulo,
		colunas: definicao.colunas,
		data: consulta.linhas,
		resumo: resumoQualidade ?? { total: consulta.total },
		paginacao: {
			page: params.filtros.page,
			limit: params.filtros.limit,
			total: consulta.total,
			totalPages: Math.ceil(consulta.total / params.filtros.limit),
		},
		...(avisos.length ? { avisos } : {}),
	};
	complementarValidacaoGtin(resultado);
	return resultado;
}

export async function buscarEmpresaRelatorio(idempresa: string) {
	const empresa = await buscarEmpresaPorId(idempresa);
	return {
		nome: empresa?.nome ?? "Empresa",
		cnpj: empresa?.cnpj ?? "",
	};
}
