export const SITUACOES_PRODUTO_RELATORIO = [
	"ativo",
	"inativo",
	"todos",
] as const;

export type SituacaoProdutoRelatorio =
	(typeof SITUACOES_PRODUTO_RELATORIO)[number];

/**
 * Converte o filtro textual da tela (ativo/inativo/todos) para o
 * inteiro da coluna `produtos.inativo`. Nunca devolve a string "inativo"
 * — isso quebra o PostgreSQL (`smallint = text`) e a API responde 500.
 */
export function mapearSituacaoParaInativo(
	situacao?: string,
): number | undefined {
	if (situacao === "ativo") return 0;
	if (situacao === "inativo") return 1;
	return undefined;
}
