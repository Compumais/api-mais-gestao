/**
 * Modelo canônico de estoque dual (operacional × fiscal).
 *
 * Por que dois estoques:
 * - Vendas podem gerar documento fiscal (NFC-e/NF-e) ou não (meio de pagamento configurável).
 * - Inventário/SINTEGRA devem bater com saídas fiscais; o operacional reflete o físico real.
 *
 * Regras:
 * 1. Entrada de NF compra → AMBOS
 * 2. Venda sem documento fiscal → só OPERACIONAL
 * 3. Venda com NFC-e/NF-e autorizada → AMBOS (no PDV: operacional na venda + fiscal só após autorização)
 * 4. Estornos → mesmo tipoestoque do movimento original
 * 5. Inventário fiscal / SINTEGRA → quantidadefiscal
 * 6. Lotes seguem o dual (quantidade + quantidadefiscal)
 */

/** 0 = operacional (real), 1 = fiscal, 2 = ambos */
export const TIPO_ESTOQUE = {
	OPERACIONAL: 0,
	FISCAL: 1,
	AMBOS: 2,
} as const;

export type TipoEstoque = (typeof TIPO_ESTOQUE)[keyof typeof TIPO_ESTOQUE];

export const TIPO_DOCUMENTO_ESTOQUE = {
	PDV: 0,
	NOTA_FISCAL: 1,
	ACERTO: 2,
	PRODUCAO: 3,
} as const;

export function tipoEstoqueAfetouOperacional(
	tipoestoque: number | null | undefined,
): boolean {
	return (
		tipoestoque === TIPO_ESTOQUE.OPERACIONAL ||
		tipoestoque === TIPO_ESTOQUE.AMBOS
	);
}

export function tipoEstoqueAfetouFiscal(
	tipoestoque: number | null | undefined,
): boolean {
	return (
		tipoestoque === TIPO_ESTOQUE.FISCAL || tipoestoque === TIPO_ESTOQUE.AMBOS
	);
}

/** Saldo de lote usado em FEFO / sugestão conforme o lado do estoque. */
export type TipoSaldoLoteFefo = "operacional" | "fiscal" | "ambos";

export function saldoDisponivelLoteFefo(
	quantidade: string | null | undefined,
	quantidadefiscal: string | null | undefined,
	tipoSaldo: TipoSaldoLoteFefo,
): number {
	const operacional = Number.parseFloat(quantidade ?? "0") || 0;
	const fiscal = Number.parseFloat(quantidadefiscal ?? "0") || 0;
	if (tipoSaldo === "fiscal") return Math.max(0, fiscal);
	if (tipoSaldo === "ambos") return Math.max(0, Math.min(operacional, fiscal));
	return Math.max(0, operacional);
}
