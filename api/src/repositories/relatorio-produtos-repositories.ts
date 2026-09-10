import { type SQL, sql } from "drizzle-orm";
import type {
	FiltrosRelatorioProdutos,
	LinhaRelatorioProdutos,
	TipoRelatorioProdutos,
	ValorRelatorio,
} from "@/model/relatorio-produtos-model.js";
import { db } from "./connection.js";

export type ConsultaRelatorioProdutos = {
	linhas: LinhaRelatorioProdutos[];
	total: number;
};

const rowsOf = <T>(result: { rows?: unknown } | unknown): T[] => {
	if (result && typeof result === "object" && "rows" in result) {
		const rows = (result as { rows?: unknown }).rows;
		if (Array.isArray(rows)) return rows as T[];
	}
	return (Array.isArray(result) ? result : []) as T[];
};

function normalizarValor(valor: unknown): ValorRelatorio {
	if (valor == null) return null;
	if (typeof valor === "number" || typeof valor === "string") return valor;
	if (typeof valor === "bigint") return Number(valor);
	if (valor instanceof Date) return valor.toISOString();
	if (typeof valor === "boolean") return valor ? "Sim" : "Não";
	return JSON.stringify(valor);
}

function extrairConsulta(resultado: unknown): ConsultaRelatorioProdutos {
	const linhasComTotal = rowsOf<Record<string, unknown>>(resultado);
	const total = Number(linhasComTotal[0]?.__total ?? 0);
	const linhas = linhasComTotal.map((linha) =>
		Object.fromEntries(
			Object.entries(linha)
				.filter(([chave]) => chave !== "__total")
				.map(([chave, valor]) => [chave, normalizarValor(valor)]),
		),
	);
	return { linhas, total };
}

function filtroSituacao(
	situacao: FiltrosRelatorioProdutos["situacao"],
	alias = "p",
): SQL {
	if (!situacao || situacao === "todos") return sql``;
	return situacao === "ativo"
		? sql`AND COALESCE(${sql.raw(`${alias}.inativo`)}, 0) = 0`
		: sql`AND COALESCE(${sql.raw(`${alias}.inativo`)}, 0) <> 0`;
}

function filtroDatas(filtros: FiltrosRelatorioProdutos, coluna: string): SQL {
	return sql`
		${filtros.dataInicio ? sql`AND ${sql.raw(coluna)} >= ${filtros.dataInicio}::date` : sql``}
		${filtros.dataFim ? sql`AND ${sql.raw(coluna)} < (${filtros.dataFim}::date + interval '1 day')` : sql``}
	`;
}

function filtroOrigemMovimento(
	origem: FiltrosRelatorioProdutos["origem"],
): SQL {
	if (origem === "pdv") return sql`AND me.tipodocumento = 0`;
	if (origem === "nota_fiscal") return sql`AND me.tipodocumento = 1`;
	if (origem === "acerto") return sql`AND me.tipodocumento = 2`;
	if (origem === "producao" || origem === "outro") {
		return sql`AND me.tipodocumento NOT IN (0, 1, 2)`;
	}
	return sql``;
}

function filtroTipoEstoque(tipo: FiltrosRelatorioProdutos["tipoEstoque"]): SQL {
	if (tipo === "operacional") return sql`AND me.tipoestoque = 0`;
	if (tipo === "fiscal") return sql`AND me.tipoestoque = 1`;
	if (tipo === "ambos") return sql`AND me.tipoestoque = 2`;
	return sql``;
}

const ORDENACOES: Record<TipoRelatorioProdutos, Record<string, string>> = {
	qualidade: {
		codigo: "codigo",
		nome: "nome",
		status: "status",
		pendencias: "pendencias",
		estoque: "estoque",
		margem_percentual: "margem_percentual",
	},
	cadastro: {
		codigo: "codigo",
		nome: "nome",
		descricao: "descricao",
		ean: "ean",
		unidade: "unidade",
		grupo: "grupo",
		marca: "marca",
		fornecedor: "fornecedor",
		status: "status",
		cadastro: "cadastro",
		alteracao: "alteracao",
		imagem: "imagem",
		duplicado: "duplicado",
	},
	ean: {
		codigo: "codigo",
		nome: "nome",
		ean_principal: "ean_principal",
		ean_tributavel: "ean_tributavel",
		eans_alternativos: "eans_alternativos",
		situacao_ean: "situacao_ean",
		quantidade_duplicada: "quantidade_duplicada",
		quantidade_eans_alternativos: "quantidade_eans_alternativos",
	},
	precos: {
		codigo: "codigo",
		nome: "nome",
		custo_aquisicao: "custo_aquisicao",
		custo_medio: "custo_medio",
		preco_venda: "preco_venda",
		margem_reais: "margem_reais",
		margem_percentual: "margem_percentual",
		preco_ultima_compra: "preco_ultima_compra",
		alteracao_preco: "alteracao_preco",
		tabelas_preco: "tabelas_preco",
		precos_minimos: "precos_minimos",
		precos_promocionais: "precos_promocionais",
	},
	estoque: {
		codigo: "codigo",
		nome: "nome",
		unidade: "unidade",
		estoque_operacional: "estoque_operacional",
		estoque_fiscal: "estoque_fiscal",
		minimo: "minimo",
		maximo: "maximo",
		custo_medio: "custo_medio",
		valor_estoque: "valor_estoque",
		ultima_entrada: "ultima_entrada",
		ultima_saida: "ultima_saida",
		dias_sem_movimento: "dias_sem_movimento",
	},
	fiscal: {
		codigo: "codigo",
		nome: "nome",
		ncm: "ncm",
		cest: "cest",
		origem: "origem",
		cfop: "cfop",
		cst: "cst",
		csosn: "csosn",
		cstpis: "cstpis",
		aliquota_pis: "aliquota_pis",
		cstcofins: "cstcofins",
		aliquota_cofins: "aliquota_cofins",
		aliquota_ipi: "aliquota_ipi",
		cstibs: "cstibs",
		classificacao_ibs_cbs: "classificacao_ibs_cbs",
		aliquota_ibs: "aliquota_ibs",
		aliquota_cbs: "aliquota_cbs",
		beneficio_fiscal: "beneficio_fiscal",
	},
	comercial: {
		codigo: "codigo",
		nome: "nome",
		quantidade: "quantidade",
		faturamento: "faturamento",
		custo_estimado_atual: "custo_estimado_atual",
		lucro: "lucro",
		margem_percentual: "margem_percentual",
		ultima_venda: "ultima_venda",
	},
	compras: {
		codigo: "codigo",
		nome: "nome",
		fornecedor: "fornecedor",
		ultima_compra: "ultima_compra",
		valor_unitario: "valor_unitario",
		frete: "frete",
		desconto: "desconto",
		custo_final: "custo_final",
		documento: "documento",
	},
	movimentacoes: {
		data_hora: "data_hora",
		codigo: "codigo",
		produto: "produto",
		origem: "origem",
		documento: "documento",
		tipo_estoque: "tipo_estoque",
		entrada: "entrada",
		saida: "saida",
		saldo_calculado: "saldo_calculado",
		custo_aquisicao: "custo_aquisicao",
		custo_medio: "custo_medio",
		lote: "lote",
		local: "local",
		observacao: "observacao",
		cancelado: "cancelado",
	},
	unidades: {
		codigo: "codigo",
		produto: "produto",
		unidade: "unidade",
		descricao_unidade: "descricao_unidade",
		fator: "fator",
		fator_alternativo: "fator_alternativo",
		fator_producao: "fator_producao",
		conversoes: "conversoes",
		validade_fatores: "validade_fatores",
	},
	composicao: {
		tipo_composicao: "tipo_composicao",
		codigo_acabado: "codigo_acabado",
		produto_acabado: "produto_acabado",
		status_composicao: "status_composicao",
		codigo_componente: "codigo_componente",
		componente: "componente",
		quantidade: "quantidade",
		custo_unitario: "custo_unitario",
		custo_componente: "custo_componente",
		estoque_componente: "estoque_componente",
		observacao: "observacao",
	},
	auditoria: {
		data_hora: "data_hora",
		acao: "acao",
		produto_id: "produto_id",
		usuario: "usuario",
		ip: "ip",
		fonte: "fonte",
		antes: "antes",
		depois: "depois",
		metadados: "metadados",
	},
};

function ordemSql(
	tipo: TipoRelatorioProdutos,
	filtros: FiltrosRelatorioProdutos,
): SQL {
	const mapa = ORDENACOES[tipo];
	const padrao = Object.values(mapa)[0] ?? "1";
	const coluna = (filtros.ordenarPor && mapa[filtros.ordenarPor]) || padrao;
	return sql.raw(
		`${coluna} ${filtros.ordem === "desc" ? "DESC" : "ASC"} NULLS LAST`,
	);
}

function paginacao(
	tipo: TipoRelatorioProdutos,
	filtros: FiltrosRelatorioProdutos,
): SQL {
	return sql`ORDER BY ${ordemSql(tipo, filtros)}
		LIMIT ${filtros.limit} OFFSET ${(filtros.page - 1) * filtros.limit}`;
}

function filtrosBase(f: FiltrosRelatorioProdutos): SQL {
	return sql`
		${filtroSituacao(f.situacao)}
		${f.q ? sql`AND (p.nome ILIKE ${`%${f.q}%`} OR p.descricao ILIKE ${`%${f.q}%`} OR p.codigo::text ILIKE ${`%${f.q}%`} OR COALESCE(p.ean, '') ILIKE ${`%${f.q}%`})` : sql``}
		${f.grupo ? sql`AND (h.id = ${f.grupo} OR h.nome ILIKE ${`%${f.grupo}%`})` : sql``}
		${f.fornecedor ? sql`AND (e.id = ${f.fornecedor} OR e.nome ILIKE ${`%${f.fornecedor}%`} OR COALESCE(p.fornecedor, '') ILIKE ${`%${f.fornecedor}%`})` : sql``}
	`;
}

function baseProdutos(f: FiltrosRelatorioProdutos): SQL {
	return sql`
		WITH custos AS (
			SELECT DISTINCT ON (cp.idproduto) cp.idproduto, cp.custoaquisicao, cp.customedio,
				cp.precocompra, cp.freteconhecimento, cp.fretesegurooutrasdesp, cp.desconto,
				cp.datahora, cp.idnotafiscal
			FROM custoproduto cp
			ORDER BY cp.idproduto, cp.datahora DESC
		), saldos AS (
			SELECT se.idempresa, se.codigoproduto,
				SUM(COALESCE(se.quantidade::numeric, 0)) estoque_operacional,
				SUM(COALESCE(se.quantidadefiscal::numeric, 0)) estoque_fiscal,
				MAX(se.ultimaalteracao) ultima_alteracao
			FROM saldoestoque se
			WHERE se.idempresa = ${f.idempresa}
			GROUP BY se.idempresa, se.codigoproduto
		), movimentos AS (
			SELECT me.idproduto,
				MAX(COALESCE(me.datahora, me.data::timestamp)) FILTER (WHERE COALESCE(me.cancelado, 0) = 0) ultimo_movimento,
				MAX(COALESCE(me.datahora, me.data::timestamp)) FILTER (WHERE COALESCE(me.quantidadeentrada::numeric, 0) > 0 AND COALESCE(me.cancelado, 0) = 0) ultima_entrada,
				MAX(COALESCE(me.datahora, me.data::timestamp)) FILTER (WHERE COALESCE(me.quantidadesaida::numeric, 0) > 0 AND COALESCE(me.cancelado, 0) = 0) ultima_saida
			FROM movimentoestoque me WHERE me.idempresa = ${f.idempresa}
			GROUP BY me.idproduto
		), duplicados AS (
			SELECT idempresa, codigo, COUNT(*) qtd_codigo
			FROM produtos WHERE idempresa = ${f.idempresa} AND codigo IS NOT NULL
			GROUP BY idempresa, codigo HAVING COUNT(*) > 1
		), eans AS (
			SELECT idempresa, ean, COUNT(*) qtd_ean
			FROM produtos WHERE idempresa = ${f.idempresa} AND NULLIF(BTRIM(ean), '') IS NOT NULL
			GROUP BY idempresa, ean HAVING COUNT(*) > 1
		), eans_alternativos AS (
			SELECT pe.idproduto,
				STRING_AGG(CONCAT(pe.ean, COALESCE(' [' || um.codigo || ' x ' || pe.fator::text || ']', '')), ', ' ORDER BY pe.ean) eans_alternativos,
				COUNT(*)::int quantidade_eans_alternativos
			FROM produto_ean pe
			LEFT JOIN unidademedida um ON um.id = pe.idunidademedida
			WHERE pe.idempresa = ${f.idempresa}
			GROUP BY pe.idproduto
		), precos_tabelas AS (
			SELECT tpi.idproduto,
				STRING_AGG(tp.nome || ': ' || tpi.preco::text, ', ' ORDER BY tp.nome) tabelas_preco,
				STRING_AGG(tp.nome || ': ' || tpi.preco_minimo::text, ', ' ORDER BY tp.nome)
					FILTER (WHERE tpi.preco_minimo IS NOT NULL) precos_minimos,
				STRING_AGG(tp.nome || ': ' || tpi.preco_promocional::text, ', ' ORDER BY tp.nome)
					FILTER (WHERE tpi.preco_promocional IS NOT NULL) precos_promocionais
			FROM tabela_preco_item tpi
			JOIN tabela_preco tp ON tp.id = tpi.idtabelapreco
				AND tp.idempresa = ${f.idempresa}
				AND COALESCE(tp.ativo, 1) = 1
				AND (tp.iniciovigencia IS NULL OR tp.iniciovigencia <= CURRENT_TIMESTAMP)
				AND (tp.fimvigencia IS NULL OR tp.fimvigencia >= CURRENT_TIMESTAMP)
			GROUP BY tpi.idproduto
		), base AS (
			SELECT p.*, h.nome grupo_nome, ma.nome marca_nome,
				COALESCE(e.nome, p.fornecedor) fornecedor_nome,
				n.codigo ncm_cadastro, ce.codigo::text cest_cadastro, cf.codigo cfop_saida,
				c.custoaquisicao custo_recente, c.customedio custo_medio_recente,
				c.precocompra preco_compra_recente, c.freteconhecimento, c.fretesegurooutrasdesp,
				c.desconto, c.datahora ultima_compra_custo,
				s.estoque_operacional, s.estoque_fiscal, s.ultima_alteracao,
				m.ultimo_movimento, m.ultima_entrada, m.ultima_saida,
				COALESCE(d.qtd_codigo, 0) codigo_duplicado,
				COALESCE(ed.qtd_ean, 0) ean_duplicado,
				pea.eans_alternativos, COALESCE(pea.quantidade_eans_alternativos, 0) quantidade_eans_alternativos,
				pt.tabelas_preco, pt.precos_minimos, pt.precos_promocionais
			FROM produtos p
			LEFT JOIN hierarquia h ON h.id = p.idgrupo AND h.idempresa = p.idempresa
			LEFT JOIN marca ma ON ma.id = p.idmarca AND ma.idempresa = p.idempresa
			LEFT JOIN entidade e ON e.id = COALESCE(p.idfornecedor, p.fornecedor) AND e.idempresa = p.idempresa
			LEFT JOIN ncm n ON n.id = p.idncm
			LEFT JOIN cest ce ON ce.id = p.idcest
			LEFT JOIN cfop cf ON cf.id = p.idcfopsaida
			LEFT JOIN custos c ON c.idproduto = p.id
			LEFT JOIN saldos s ON s.idempresa = p.idempresa AND s.codigoproduto = p.codigo::text
			LEFT JOIN movimentos m ON m.idproduto = p.id
			LEFT JOIN duplicados d ON d.idempresa = p.idempresa AND d.codigo = p.codigo
			LEFT JOIN eans ed ON ed.idempresa = p.idempresa AND ed.ean = p.ean
			LEFT JOIN eans_alternativos pea ON pea.idproduto = p.id
			LEFT JOIN precos_tabelas pt ON pt.idproduto = p.id
			WHERE p.idempresa = ${f.idempresa} ${filtrosBase(f)}
		)
	`;
}

async function consultarBase(
	tipo: TipoRelatorioProdutos,
	f: FiltrosRelatorioProdutos,
	selecao: SQL,
	filtroExtra: SQL = sql``,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		${baseProdutos(f)}
		SELECT ${selecao}, COUNT(*) OVER()::int __total
		FROM base b
		WHERE 1=1 ${filtroExtra}
		${paginacao(tipo, f)}
	`);
	return extrairConsulta(resultado);
}

function pendenciaBase(f: FiltrosRelatorioProdutos): SQL {
	switch (f.pendencia) {
		case "ean":
			return sql`AND NULLIF(BTRIM(b.ean), '') IS NULL`;
		case "ncm":
			return sql`AND COALESCE(NULLIF(BTRIM(b.ncm), ''), NULLIF(BTRIM(b.ncm_cadastro), '')) IS NULL`;
		case "cest":
			return sql`AND COALESCE(b.cest_cadastro, b.cest::text) IS NULL`;
		case "preco":
			return sql`AND COALESCE(b.preco::numeric, 0) <= 0`;
		case "fornecedor":
			return sql`AND b.fornecedor_nome IS NULL`;
		case "grupo":
			return sql`AND b.grupo_nome IS NULL`;
		case "tributacao":
			return sql`AND COALESCE(b.situacaotributaria, b.tributacaosn) IS NULL`;
		case "foto":
			return sql`AND COALESCE(NULLIF(b.imagem, ''), NULLIF(b.caminhoimagem, '')) IS NULL`;
		case "duplicado":
			return sql`AND (b.ean_duplicado > 0 OR b.codigo_duplicado > 0)`;
		case "margem_baixa":
			return sql`AND b.preco::numeric > 0
				AND (b.preco::numeric - COALESCE(b.custo_recente::numeric, b.custoaquisicao::numeric, 0))
					/ b.preco::numeric * 100 < 10`;
		case "estoque_negativo":
			return sql`AND COALESCE(b.estoque_operacional, 0) < 0`;
		default:
			return sql``;
	}
}

async function consultarProdutosBase(
	tipo: TipoRelatorioProdutos,
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	if (tipo === "qualidade") {
		return consultarBase(
			tipo,
			f,
			sql`
			b.codigo, b.nome,
			CASE WHEN COALESCE(b.inativo, 0) = 0 THEN 'Ativo' ELSE 'Inativo' END status,
			CONCAT_WS(', ',
				CASE WHEN NULLIF(BTRIM(b.ean), '') IS NULL THEN 'Sem EAN' END,
				CASE WHEN COALESCE(NULLIF(BTRIM(b.ncm), ''), NULLIF(BTRIM(b.ncm_cadastro), '')) IS NULL THEN 'Sem NCM' END,
				CASE WHEN COALESCE(b.preco::numeric, 0) <= 0 THEN 'Sem preço' END,
				CASE WHEN b.fornecedor_nome IS NULL THEN 'Sem fornecedor' END,
				CASE WHEN b.grupo_nome IS NULL THEN 'Sem grupo' END,
				CASE WHEN COALESCE(b.situacaotributaria, b.tributacaosn) IS NULL THEN 'Sem tributação' END,
				CASE WHEN b.ean_duplicado > 0 THEN 'EAN duplicado' END,
				CASE WHEN b.codigo_duplicado > 0 THEN 'Código duplicado' END,
				CASE WHEN COALESCE(b.estoque_operacional, 0) < 0 THEN 'Estoque negativo' END
			) pendencias,
			COALESCE(b.estoque_operacional, 0)::numeric estoque,
			CASE WHEN b.preco::numeric > 0 THEN ROUND((b.preco::numeric - COALESCE(b.custo_recente::numeric, b.custoaquisicao::numeric, 0)) / b.preco::numeric * 100, 2) END margem_percentual
		`,
			pendenciaBase(f),
		);
	}

	if (tipo === "cadastro") {
		return consultarBase(
			tipo,
			f,
			sql`
			b.codigo, b.nome, b.descricao, b.ean, b.unidademedida unidade,
			b.grupo_nome grupo, b.marca_nome marca, b.fornecedor_nome fornecedor,
			CASE WHEN COALESCE(b.inativo, 0) = 0 THEN 'Ativo' ELSE 'Inativo' END status,
			b.datacadastro::text cadastro, b.dataalteracao::text alteracao,
			COALESCE(b.imagem, b.caminhoimagem) imagem,
			CASE WHEN b.ean_duplicado > 0 OR b.codigo_duplicado > 0 THEN 'Sim' ELSE 'Não' END duplicado
		`,
			pendenciaBase(f),
		);
	}

	if (tipo === "ean") {
		return consultarBase(
			tipo,
			f,
			sql`
			b.codigo, b.nome, b.ean ean_principal, b.eantributavel ean_tributavel,
			b.eans_alternativos,
			CASE
				WHEN NULLIF(BTRIM(b.ean), '') IS NULL THEN 'Vazio'
				WHEN b.ean !~ '^[0-9]{8}$|^[0-9]{12,14}$' THEN 'Formato inválido'
				WHEN b.ean_duplicado > 0 THEN 'Duplicado'
				ELSE 'Validar dígito'
			END situacao_ean,
			CASE WHEN b.ean_duplicado > 0 THEN b.ean_duplicado ELSE 0 END quantidade_duplicada,
			b.quantidade_eans_alternativos
		`,
			pendenciaBase(f),
		);
	}

	if (tipo === "precos") {
		const margem = sql`CASE WHEN COALESCE(b.preco::numeric, 0) > 0
			THEN (b.preco::numeric - COALESCE(b.custo_recente::numeric, b.custoaquisicao::numeric, 0)) / b.preco::numeric * 100 END`;
		return consultarBase(
			tipo,
			f,
			sql`
			b.codigo, b.nome,
			COALESCE(b.custo_recente::numeric, b.custoaquisicao::numeric, 0) custo_aquisicao,
			COALESCE(b.custo_medio_recente::numeric, b.customedioinicial::numeric, 0) custo_medio,
			COALESCE(b.preco::numeric, 0) preco_venda,
			ROUND(COALESCE(b.preco::numeric, 0) - COALESCE(b.custo_recente::numeric, b.custoaquisicao::numeric, 0), 2) margem_reais,
			ROUND(${margem}, 2) margem_percentual,
			b.precoultimacompra::numeric preco_ultima_compra,
			b.dataalteracaopreco::text alteracao_preco,
			b.tabelas_preco, b.precos_minimos, b.precos_promocionais
		`,
			sql`
			${f.margemMin !== undefined ? sql`AND ${margem} >= ${f.margemMin}` : sql``}
			${f.margemMax !== undefined ? sql`AND ${margem} <= ${f.margemMax}` : sql``}
		`,
		);
	}

	if (tipo === "estoque") {
		return consultarBase(
			tipo,
			f,
			sql`
			b.codigo, b.nome, b.unidademedida unidade,
			COALESCE(b.estoque_operacional, 0)::numeric estoque_operacional,
			COALESCE(b.estoque_fiscal, 0)::numeric estoque_fiscal,
			b.quantidademinima minimo, b.quantidademaxima maximo,
			COALESCE(b.custo_medio_recente::numeric, b.customedioinicial::numeric, 0) custo_medio,
			ROUND(COALESCE(b.estoque_operacional, 0) * COALESCE(b.custo_medio_recente::numeric, b.customedioinicial::numeric, 0), 2) valor_estoque,
			b.ultima_entrada::text ultima_entrada, b.ultima_saida::text ultima_saida,
			CASE WHEN b.ultimo_movimento IS NULL THEN NULL ELSE (CURRENT_DATE - b.ultimo_movimento::date)::int END dias_sem_movimento
		`,
			sql`
			${f.pendencia === "abaixo_minimo" ? sql`AND COALESCE(b.quantidademinima, 0) > 0 AND COALESCE(b.estoque_operacional, 0) < b.quantidademinima` : sql``}
			${f.pendencia === "sem_estoque" ? sql`AND COALESCE(b.estoque_operacional, 0) = 0` : sql``}
			${f.pendencia === "negativo" ? sql`AND COALESCE(b.estoque_operacional, 0) < 0` : sql``}
			${f.diasSemMovimento !== undefined ? sql`AND (b.ultimo_movimento IS NULL OR CURRENT_DATE - b.ultimo_movimento::date >= ${f.diasSemMovimento})` : sql``}
		`,
		);
	}

	return consultarBase(
		tipo,
		f,
		sql`
		b.codigo, b.nome,
		COALESCE(NULLIF(BTRIM(b.ncm), ''), b.ncm_cadastro) ncm,
		COALESCE(b.cest_cadastro, b.cest::text) cest,
		b.origem, b.cfop_saida cfop, b.situacaotributaria cst,
		COALESCE(b.tributacaosn, b.situacaotributariasn) csosn,
		b.cstpis, b.aliquotapis::numeric aliquota_pis,
		b.cstcofins, b.aliquotacofins::numeric aliquota_cofins,
		b.percentualipisaida::numeric aliquota_ipi,
		b.cstibs, b.classtributariaibs classificacao_ibs_cbs,
		b.aliquotaiibs::numeric aliquota_ibs, b.aliquotacbs::numeric aliquota_cbs,
		COALESCE(b.idbeneficiofiscalnf, b.idbeneficiofiscaloperacao) beneficio_fiscal
	`,
		pendenciaBase(f),
	);
}

async function consultarComercial(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		WITH dados AS (
			SELECT p.codigo, p.nome,
				COALESCE(SUM(vi.quantidade::numeric), 0) quantidade,
				COALESCE(SUM(vi.precototal::numeric), 0) faturamento,
				COALESCE(SUM(vi.quantidade::numeric * COALESCE(p.customedioinicial::numeric, p.custoaquisicao::numeric, 0)), 0) custo_estimado_atual,
				MAX(v.datacriacao) ultima_venda
			FROM produtos p
			JOIN vendapdvitem vi ON vi.idproduto = p.id AND vi.idempresa = p.idempresa
			JOIN vendapdvgourmet v ON v.id = vi.idvenda AND v.idempresa = p.idempresa
			WHERE p.idempresa = ${f.idempresa}
				${filtroSituacao(f.situacao)}
				${f.q ? sql`AND (p.nome ILIKE ${`%${f.q}%`} OR p.codigo::text ILIKE ${`%${f.q}%`})` : sql``}
				${filtroDatas(f, "v.datacriacao")}
			GROUP BY p.id, p.codigo, p.nome
		), final AS (
			SELECT codigo, nome, quantidade, faturamento, custo_estimado_atual,
				ROUND(faturamento - custo_estimado_atual, 2) lucro,
				CASE WHEN faturamento > 0 THEN ROUND((faturamento - custo_estimado_atual) / faturamento * 100, 2) END margem_percentual,
				ultima_venda::text ultima_venda
			FROM dados
		)
		SELECT *, COUNT(*) OVER()::int __total FROM final
		WHERE 1=1
			${f.margemMin !== undefined ? sql`AND margem_percentual >= ${f.margemMin}` : sql``}
			${f.margemMax !== undefined ? sql`AND margem_percentual <= ${f.margemMax}` : sql``}
		${paginacao("comercial", f)}
	`);
	return extrairConsulta(resultado);
}

async function consultarCompras(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		WITH dados AS (
			SELECT p.codigo, p.nome, COALESCE(e.nome, p.fornecedor) fornecedor,
				cp.datahora::text ultima_compra, cp.precocompra::numeric valor_unitario,
				cp.freteconhecimento::numeric frete, cp.desconto::numeric desconto,
				cp.custoaquisicao::numeric custo_final,
				cp.idnotafiscal documento,
				ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY cp.datahora DESC) posicao
			FROM produtos p
			JOIN custoproduto cp ON cp.idproduto = p.id
			LEFT JOIN entidade e ON e.id = COALESCE(p.idfornecedor, p.fornecedor) AND e.idempresa = p.idempresa
			WHERE p.idempresa = ${f.idempresa}
				${filtroSituacao(f.situacao)}
				${f.q ? sql`AND (p.nome ILIKE ${`%${f.q}%`} OR p.codigo::text ILIKE ${`%${f.q}%`})` : sql``}
				${f.fornecedor ? sql`AND (e.id = ${f.fornecedor} OR e.nome ILIKE ${`%${f.fornecedor}%`})` : sql``}
				${filtroDatas(f, "cp.datahora")}
		)
		SELECT codigo, nome, fornecedor, ultima_compra, valor_unitario, frete, desconto,
			custo_final, documento, COUNT(*) OVER()::int __total
		FROM dados WHERE posicao = 1
		${paginacao("compras", f)}
	`);
	return extrairConsulta(resultado);
}

async function consultarMovimentacoes(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		SELECT COALESCE(me.datahora, me.data::timestamp)::text data_hora,
			p.codigo, p.nome produto,
			CASE me.tipodocumento WHEN 0 THEN 'PDV' WHEN 1 THEN 'Nota fiscal' WHEN 2 THEN 'Acerto' ELSE 'Outro' END origem,
			me.idoriginal documento,
			CASE me.tipoestoque WHEN 0 THEN 'Operacional' WHEN 1 THEN 'Fiscal' WHEN 2 THEN 'Ambos' END tipo_estoque,
			COALESCE(me.quantidadeentrada::numeric, 0) entrada,
			COALESCE(me.quantidadesaida::numeric, 0) saida,
			SUM(COALESCE(me.quantidadeentrada::numeric, 0) - COALESCE(me.quantidadesaida::numeric, 0))
				OVER (PARTITION BY me.idproduto ORDER BY COALESCE(me.datahora, me.data::timestamp), me.id) saldo_calculado,
			me.custoaquisicao::numeric custo_aquisicao, me.customedio::numeric custo_medio,
			me.idlote lote, le.descricao local, me.observacao,
			CASE WHEN COALESCE(me.cancelado, 0) <> 0 THEN 'Sim' ELSE 'Não' END cancelado,
			COUNT(*) OVER()::int __total
		FROM movimentoestoque me
		LEFT JOIN produtos p ON p.id = me.idproduto AND p.idempresa = me.idempresa
		LEFT JOIN localestoque le ON le.id = me.idlocalestoque
		WHERE me.idempresa = ${f.idempresa}
			${f.q ? sql`AND (p.nome ILIKE ${`%${f.q}%`} OR p.codigo::text ILIKE ${`%${f.q}%`} OR me.idoriginal ILIKE ${`%${f.q}%`})` : sql``}
			${filtroDatas(f, "COALESCE(me.datahora, me.data::timestamp)")}
			${filtroOrigemMovimento(f.origem)}
			${filtroTipoEstoque(f.tipoEstoque)}
			${f.situacao === "ativo" ? sql`AND COALESCE(me.cancelado, 0) = 0` : sql``}
			${f.situacao === "inativo" ? sql`AND COALESCE(me.cancelado, 0) <> 0` : sql``}
		${paginacao("movimentacoes", f)}
	`);
	return extrairConsulta(resultado);
}

async function consultarUnidades(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		SELECT p.codigo, p.nome produto, COALESCE(um.codigo, p.unidademedida) unidade,
			um.nome descricao_unidade, p.fatorconversao::numeric fator,
			p.fatorconversaoalternativo::numeric fator_alternativo,
			p.fatorconversaoproducao::numeric fator_producao,
			conv.conversoes,
			CASE WHEN COALESCE(p.fatorconversao::numeric, 1) <= 0
				OR COALESCE(p.fatorconversaoalternativo::numeric, 1) <= 0
				OR COALESCE(conv.possui_invalido, false)
				THEN 'Inválido' ELSE 'Válido' END validade_fatores,
			COUNT(*) OVER()::int __total
		FROM produtos p
		LEFT JOIN unidademedida um ON um.id = p.idunidademedida
		LEFT JOIN LATERAL (
			SELECT STRING_AGG(umc.codigo || ' ' || puc.operacao || ' ' || puc.fator::text, ', ' ORDER BY umc.codigo) conversoes,
				BOOL_OR(puc.fator::numeric <= 0) possui_invalido
			FROM produto_unidade_conversao puc
			JOIN unidademedida umc ON umc.id = puc.idunidademedida
			WHERE puc.idproduto = p.id AND puc.idempresa = p.idempresa
		) conv ON true
		WHERE p.idempresa = ${f.idempresa}
			${filtroSituacao(f.situacao)}
			${f.q ? sql`AND (p.nome ILIKE ${`%${f.q}%`} OR p.codigo::text ILIKE ${`%${f.q}%`} OR um.codigo ILIKE ${`%${f.q}%`})` : sql``}
			${f.pendencia === "fator_invalido" ? sql`AND (COALESCE(p.fatorconversao::numeric, 1) <= 0 OR COALESCE(p.fatorconversaoalternativo::numeric, 1) <= 0 OR COALESCE(conv.possui_invalido, false))` : sql``}
		${paginacao("unidades", f)}
	`);
	return extrairConsulta(resultado);
}

async function consultarComposicao(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		WITH saldos AS (
			SELECT idempresa, codigoproduto, SUM(COALESCE(quantidade::numeric, 0)) quantidade
			FROM saldoestoque WHERE idempresa = ${f.idempresa}
			GROUP BY idempresa, codigoproduto
		), dados AS (
			SELECT 'BOM'::text tipo_composicao, pa.codigo codigo_acabado,
				pa.nome produto_acabado,
				CASE WHEN fp.ativo = 1 THEN 'Ativa' ELSE 'Inativa' END status_composicao,
				pc.codigo codigo_componente, pc.nome componente, fi.quantidade::numeric quantidade,
				COALESCE(pc.customedioinicial::numeric, pc.custoaquisicao::numeric, 0) custo_unitario,
				ROUND(fi.quantidade::numeric * COALESCE(pc.customedioinicial::numeric, pc.custoaquisicao::numeric, 0), 2) custo_componente,
				COALESCE(se.quantidade, 0) estoque_componente, fp.observacao,
				(fi.id IS NULL) sem_itens
			FROM fichaproducao fp
			JOIN produtos pa ON pa.id = fp.idprodutoacabado AND pa.idempresa = fp.idempresa
			LEFT JOIN fichaproducaoitem fi ON fi.idfichaproducao = fp.id
			LEFT JOIN produtos pc ON pc.id = fi.idproduto
			LEFT JOIN saldos se ON se.idempresa = fp.idempresa AND se.codigoproduto = pc.codigo::text
			WHERE fp.idempresa = ${f.idempresa}
				${f.situacao === "ativo" ? sql`AND fp.ativo = 1` : sql``}
				${f.situacao === "inativo" ? sql`AND fp.ativo <> 1` : sql``}
			UNION ALL
			SELECT 'KIT'::text, pa.codigo, pa.nome,
				CASE WHEN COALESCE(pa.inativo, 0) = 0 THEN 'Ativo' ELSE 'Inativo' END,
				pc.codigo, pc.nome, pki.quantidade::numeric,
				COALESCE(pc.customedioinicial::numeric, pc.custoaquisicao::numeric, 0),
				ROUND(pki.quantidade::numeric * COALESCE(pc.customedioinicial::numeric, pc.custoaquisicao::numeric, 0), 2),
				COALESCE(se.quantidade, 0), NULL::text, (pki.id IS NULL)
			FROM produtos pa
			LEFT JOIN produto_kit_item pki ON pki.idprodutokit = pa.id AND pki.idempresa = pa.idempresa
			LEFT JOIN produtos pc ON pc.id = pki.idprodutocomponente
			LEFT JOIN saldos se ON se.idempresa = pa.idempresa AND se.codigoproduto = pc.codigo::text
			WHERE pa.idempresa = ${f.idempresa} AND pa.kit = 1
				${filtroSituacao(f.situacao, "pa")}
		)
		SELECT tipo_composicao, codigo_acabado, produto_acabado, status_composicao,
			codigo_componente, componente, quantidade, custo_unitario, custo_componente,
			estoque_componente, observacao, COUNT(*) OVER()::int __total
		FROM dados
		WHERE 1=1
			${f.q ? sql`AND (produto_acabado ILIKE ${`%${f.q}%`} OR codigo_acabado::text ILIKE ${`%${f.q}%`} OR componente ILIKE ${`%${f.q}%`})` : sql``}
			${f.pendencia === "sem_itens" ? sql`AND sem_itens` : sql``}
		${paginacao("composicao", f)}
	`);
	return extrairConsulta(resultado);
}

async function consultarAuditoria(
	f: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	const resultado = await db.execute(sql`
		WITH dados AS (
			SELECT ph.criadoem, ph.acao, ph.idproduto produto_id, u.nome usuario,
				ph.antes::text antes, ph.depois::text depois, NULL::text metadados,
				ph.ip, 'produto_historico'::text fonte
			FROM produto_historico ph
			LEFT JOIN usuarios u ON u.id = ph.idusuario
			WHERE ph.idempresa = ${f.idempresa}
				${filtroDatas(f, "ph.criadoem")}
			UNION ALL
			SELECT al.criadoem, al.acao, al.idrecurso, u.nome,
				COALESCE(al.metadados->'antes', al.metadados->'before')::text,
				COALESCE(al.metadados->'depois', al.metadados->'after')::text,
				al.metadados::text, NULL::text, 'audit_logs'::text
			FROM audit_logs al
			LEFT JOIN usuarios u ON u.id = al.idusuario
			WHERE al.idempresa = ${f.idempresa}
				AND LOWER(al.recurso) IN ('produto', 'produtos')
				${filtroDatas(f, "al.criadoem")}
		)
		SELECT criadoem::text data_hora, acao, produto_id, usuario, antes, depois,
			metadados, ip, fonte, COUNT(*) OVER()::int __total
		FROM dados
		WHERE 1=1
			${f.q ? sql`AND (produto_id ILIKE ${`%${f.q}%`} OR acao ILIKE ${`%${f.q}%`} OR usuario ILIKE ${`%${f.q}%`})` : sql``}
		${paginacao("auditoria", f)}
	`);
	return extrairConsulta(resultado);
}

export async function consultarRelatorioProdutos(
	tipo: TipoRelatorioProdutos,
	filtros: FiltrosRelatorioProdutos,
): Promise<ConsultaRelatorioProdutos> {
	if (
		["qualidade", "cadastro", "ean", "precos", "estoque", "fiscal"].includes(
			tipo,
		)
	) {
		return consultarProdutosBase(tipo, filtros);
	}
	if (tipo === "comercial") return consultarComercial(filtros);
	if (tipo === "compras") return consultarCompras(filtros);
	if (tipo === "movimentacoes") return consultarMovimentacoes(filtros);
	if (tipo === "unidades") return consultarUnidades(filtros);
	if (tipo === "composicao") return consultarComposicao(filtros);
	return consultarAuditoria(filtros);
}

export async function consultarResumoQualidadeProdutos(
	filtros: FiltrosRelatorioProdutos,
): Promise<Record<string, number>> {
	const resultado = await db.execute(sql`
		${baseProdutos(filtros)}
		SELECT
			COUNT(*)::int total,
			COUNT(*) FILTER (WHERE COALESCE(inativo, 0) = 0)::int ativos,
			COUNT(*) FILTER (WHERE COALESCE(inativo, 0) <> 0)::int inativos,
			COUNT(*) FILTER (WHERE NULLIF(BTRIM(ean), '') IS NULL)::int sem_ean,
			COUNT(*) FILTER (WHERE COALESCE(NULLIF(BTRIM(ncm), ''), NULLIF(BTRIM(ncm_cadastro), '')) IS NULL)::int sem_ncm,
			COUNT(*) FILTER (WHERE COALESCE(cest_cadastro, cest::text) IS NULL)::int sem_cest,
			COUNT(*) FILTER (WHERE COALESCE(preco::numeric, 0) <= 0)::int sem_preco,
			COUNT(*) FILTER (WHERE fornecedor_nome IS NULL)::int sem_fornecedor,
			COUNT(*) FILTER (WHERE grupo_nome IS NULL)::int sem_grupo,
			COUNT(*) FILTER (WHERE COALESCE(situacaotributaria, tributacaosn) IS NULL)::int sem_tributacao,
			COUNT(*) FILTER (WHERE COALESCE(NULLIF(imagem, ''), NULLIF(caminhoimagem, '')) IS NULL)::int sem_foto,
			COUNT(*) FILTER (WHERE ean_duplicado > 0)::int ean_duplicado,
			COUNT(*) FILTER (WHERE codigo_duplicado > 0)::int codigo_duplicado,
			COUNT(*) FILTER (WHERE COALESCE(estoque_operacional, 0) < 0)::int estoque_negativo,
			COUNT(*) FILTER (WHERE preco::numeric > 0
				AND (preco::numeric - COALESCE(custo_recente::numeric, custoaquisicao::numeric, 0)) / preco::numeric * 100 < 10)::int margem_baixa
		FROM base
	`);
	const linha = rowsOf<Record<string, unknown>>(resultado)[0] ?? {};
	return Object.fromEntries(
		Object.entries(linha).map(([chave, valor]) => [chave, Number(valor ?? 0)]),
	);
}

export async function consultarDisponibilidadePrecosProdutos(
	idempresa: string,
): Promise<{ tabelas: number; promocoes: number }> {
	const resultado = await db.execute(sql`
		SELECT COUNT(*)::int tabelas,
			COUNT(*) FILTER (WHERE tpi.preco_promocional IS NOT NULL)::int promocoes
		FROM tabela_preco_item tpi
		JOIN tabela_preco tp ON tp.id = tpi.idtabelapreco
		WHERE tp.idempresa = ${idempresa}
	`);
	const linha = rowsOf<{ tabelas?: unknown; promocoes?: unknown }>(
		resultado,
	)[0];
	return {
		tabelas: Number(linha?.tabelas ?? 0),
		promocoes: Number(linha?.promocoes ?? 0),
	};
}
