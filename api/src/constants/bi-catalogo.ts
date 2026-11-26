import type { BiColSpan } from "../../drizzle/tables/bi-dashboard-layout.js";
import type {
	BiMapeamentoGrafico,
	BiTipoGrafico,
} from "../../drizzle/tables/bi-widget.js";

export type BiCatalogoItem = {
	codigo: string;
	categoria: "Vendas" | "Financeiro" | "Estoque" | "Fiscal";
	titulo: string;
	descricao: string;
	sql: string;
	tipoGrafico: BiTipoGrafico;
	mapeamento: BiMapeamentoGrafico;
	larguraPadrao: BiColSpan;
};

export const BI_CATALOGO_GRAFICOS: BiCatalogoItem[] = [
	{
		codigo: "vendas_pdv_por_dia",
		categoria: "Vendas",
		titulo: "Faturamento PDV por Dia",
		descricao: "Evolução diária do valor total vendido no PDV no período selecionado.",
		sql: `SELECT
	TO_CHAR(data_venda::date, 'DD/MM') AS dia,
	ROUND(COALESCE(SUM(valor_total), 0)::numeric, 2) AS total
FROM vw_vendas_pdv
WHERE cancelada = false
	AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
GROUP BY data_venda::date
ORDER BY data_venda::date ASC`,
		tipoGrafico: "linha",
		mapeamento: {
			eixoX: "dia",
			series: [{ coluna: "total", label: "Faturamento", cor: "#2563eb" }],
			formato: "moeda",
		},
		larguraPadrao: 8,
	},
	{
		codigo: "vendas_pdv_formas_pagamento",
		categoria: "Vendas",
		titulo: "Vendas PDV por Forma de Pagamento",
		descricao: "Distribuição das vendas entre Dinheiro, PIX, Crédito e Débito.",
		sql: `SELECT forma, ROUND(total::numeric, 2) AS total
FROM (
	SELECT 'Dinheiro' AS forma, COALESCE(SUM(valor_dinheiro), 0) AS total
	FROM vw_vendas_pdv
	WHERE cancelada = false AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
	UNION ALL
	SELECT 'PIX' AS forma, COALESCE(SUM(valor_pix), 0) AS total
	FROM vw_vendas_pdv
	WHERE cancelada = false AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
	UNION ALL
	SELECT 'Cartão Crédito' AS forma, COALESCE(SUM(valor_cartao_credito), 0) AS total
	FROM vw_vendas_pdv
	WHERE cancelada = false AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
	UNION ALL
	SELECT 'Cartão Débito' AS forma, COALESCE(SUM(valor_cartao_debito), 0) AS total
	FROM vw_vendas_pdv
	WHERE cancelada = false AND data_venda::date BETWEEN :data_inicio::date AND :data_fim::date
) resumo
WHERE total > 0
ORDER BY total DESC`,
		tipoGrafico: "pizza",
		mapeamento: {
			eixoX: "forma",
			series: [{ coluna: "total", label: "Total" }],
			formato: "moeda",
		},
		larguraPadrao: 4,
	},
	{
		codigo: "financeiro_receitas_vs_despesas_mes",
		categoria: "Financeiro",
		titulo: "Receitas vs Despesas por Mês",
		descricao: "Comparativo mensal de títulos a receber e a pagar por vencimento.",
		sql: `SELECT
	TO_CHAR(DATE_TRUNC('month', vencimento), 'MM/YYYY') AS mes,
	ROUND(COALESCE(SUM(CASE WHEN tipo = 'R' THEN valor ELSE 0 END), 0)::numeric, 2) AS receitas,
	ROUND(COALESCE(SUM(CASE WHEN tipo = 'P' THEN valor ELSE 0 END), 0)::numeric, 2) AS despesas
FROM vw_financeiro
WHERE vencimento BETWEEN :data_inicio::date AND :data_fim::date
GROUP BY DATE_TRUNC('month', vencimento)
ORDER BY DATE_TRUNC('month', vencimento) ASC`,
		tipoGrafico: "barra",
		mapeamento: {
			eixoX: "mes",
			series: [
				{ coluna: "receitas", label: "Receitas", cor: "#16a34a" },
				{ coluna: "despesas", label: "Despesas", cor: "#dc2626" },
			],
			formato: "moeda",
		},
		larguraPadrao: 6,
	},
	{
		codigo: "kpi_contas_receber_aberto",
		categoria: "Financeiro",
		titulo: "Contas a Receber em Aberto",
		descricao: "Saldo total pendente de recebimento no período de vencimento.",
		sql: `SELECT
	ROUND(COALESCE(SUM(saldo), 0)::numeric, 2) AS total_aberto
FROM vw_financeiro
WHERE tipo = 'R'
	AND saldo > 0
	AND vencimento BETWEEN :data_inicio::date AND :data_fim::date`,
		tipoGrafico: "kpi",
		mapeamento: {
			colunaValor: "total_aberto",
			formato: "moeda",
		},
		larguraPadrao: 4,
	},
	{
		codigo: "kpi_contas_pagar_aberto",
		categoria: "Financeiro",
		titulo: "Contas a Pagar em Aberto",
		descricao: "Saldo total pendente de pagamento no período de vencimento.",
		sql: `SELECT
	ROUND(COALESCE(SUM(saldo), 0)::numeric, 2) AS total_aberto
FROM vw_financeiro
WHERE tipo = 'P'
	AND saldo > 0
	AND vencimento BETWEEN :data_inicio::date AND :data_fim::date`,
		tipoGrafico: "kpi",
		mapeamento: {
			colunaValor: "total_aberto",
			formato: "moeda",
		},
		larguraPadrao: 4,
	},
	{
		codigo: "top_clientes_financeiro",
		categoria: "Financeiro",
		titulo: "Top 10 Clientes (Financeiro)",
		descricao: "Clientes com maior volume de títulos a receber no período.",
		sql: `SELECT
	COALESCE(entidade_nome, 'Sem entidade') AS cliente,
	ROUND(COALESCE(SUM(valor), 0)::numeric, 2) AS total
FROM vw_financeiro
WHERE tipo = 'R'
	AND emissao BETWEEN :data_inicio::date AND :data_fim::date
GROUP BY entidade_nome
ORDER BY total DESC
LIMIT 10`,
		tipoGrafico: "barra",
		mapeamento: {
			eixoX: "cliente",
			series: [{ coluna: "total", label: "Total", cor: "#7c3aed" }],
			formato: "moeda",
		},
		larguraPadrao: 6,
	},
	{
		codigo: "estoque_menor_saldo",
		categoria: "Estoque",
		titulo: "Produtos com Menor Saldo em Estoque",
		descricao: "Lista dos 20 produtos com menor quantidade disponível em estoque.",
		sql: `SELECT
	codigo_produto,
	nome_produto,
	unidade_medida,
	ROUND(COALESCE(quantidade, 0)::numeric, 2) AS quantidade
FROM vw_estoque_saldos
ORDER BY quantidade ASC NULLS LAST
LIMIT 20`,
		tipoGrafico: "tabela",
		mapeamento: {
			formato: "numero",
		},
		larguraPadrao: 6,
	},
	{
		codigo: "notas_fiscais_por_modelo",
		categoria: "Fiscal",
		titulo: "Notas Fiscais por Modelo no Período",
		descricao: "Quantidade e valor total de notas emitidas agrupadas por modelo (55/65).",
		sql: `SELECT
	COALESCE(modelo, 'N/I') AS modelo,
	COUNT(*)::integer AS quantidade,
	ROUND(COALESCE(SUM(valor_total), 0)::numeric, 2) AS valor_total
FROM vw_notas_fiscais
WHERE emissao BETWEEN :data_inicio::date AND :data_fim::date
GROUP BY modelo
ORDER BY valor_total DESC`,
		tipoGrafico: "barra",
		mapeamento: {
			eixoX: "modelo",
			series: [{ coluna: "valor_total", label: "Valor Total", cor: "#ea580c" }],
			formato: "moeda",
		},
		larguraPadrao: 6,
	},
];
