import { z } from "zod";

export const ESCOPO_CONDICAO_PAGAMENTO = {
	COMPRA_E_VENDA: 0,
	VENDAS: 1,
	COMPRAS: 2,
} as const;

export const ESCOPO_CONDICAO_PAGAMENTO_OPCOES = [
	{
		value: String(ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA),
		label: "Compra e venda",
	},
	{
		value: String(ESCOPO_CONDICAO_PAGAMENTO.VENDAS),
		label: "Vendas",
	},
	{
		value: String(ESCOPO_CONDICAO_PAGAMENTO.COMPRAS),
		label: "Compras",
	},
] as const;

export const condicaoPagamentoFormSchema = z.object({
	codigo: z
		.string()
		.max(10, "Código deve ter no máximo 10 caracteres")
		.optional(),
	descricao: z
		.string()
		.min(1, "Descrição é obrigatória")
		.max(512, "Descrição deve ter no máximo 512 caracteres"),
	parcelas: z.coerce
		.number()
		.int("Parcelas deve ser um número inteiro")
		.min(1, "Mínimo de 1 parcela")
		.max(999, "Máximo de 999 parcelas"),
	prazos: z
		.string()
		.max(512, "Prazos deve ter no máximo 512 caracteres")
		.optional(),
	escopo: z.coerce.number().int().min(0).max(2),
	inativo: z.boolean(),
});

export type CondicaoPagamentoFormData = z.output<typeof condicaoPagamentoFormSchema>;

export function formatarEscopoCondicaoPagamento(escopo: number | null) {
	if (escopo === ESCOPO_CONDICAO_PAGAMENTO.VENDAS) return "Vendas";
	if (escopo === ESCOPO_CONDICAO_PAGAMENTO.COMPRAS) return "Compras";
	if (escopo === ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA) return "Compra e venda";
	return "-";
}
