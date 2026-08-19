import { z } from "zod";
import type { NovoProduto } from "@/model/produto-model.js";
import { camposImpostosProdutoSchema } from "@/util/campos-impostos-produto.js";
import { camposServicoProdutoSchema } from "@/util/campos-servico-produto.js";

export const LIMITE_ALTERACAO_EM_MASSA_PRODUTOS = 500;

export const camposAlteracaoEmMassaProdutoSchema = z
	.object({
		...camposImpostosProdutoSchema,
		idgrupo: z.string().uuid().optional().nullable(),
		idunidademedida: z.string().uuid().optional(),
		preco: z.union([z.string(), z.number()]).optional(),
		custoaquisicao: z.union([z.string(), z.number()]).optional().nullable(),
		origem: z.number().int().min(0).max(8).optional().nullable(),
		ncm: z
			.string()
			.max(10)
			.optional()
			.nullable()
			.transform((valor) => {
				if (valor === undefined) return undefined;
				const texto = valor?.trim();
				return texto ? texto : null;
			}),
		ippt: z.enum(["P", "T"]).optional().nullable(),
		inativo: z.number().int().min(0).max(1).optional().nullable(),
		tipoproduto: z.string().max(2).optional().nullable(),
		aliquotapis: camposServicoProdutoSchema.aliquotapis,
		aliquotacofins: camposServicoProdutoSchema.aliquotacofins,
	})
	.refine(
		(campos) => Object.values(campos).some((valor) => valor !== undefined),
		{ message: "Selecione ao menos um campo para alterar" },
	);

export type CamposAlteracaoEmMassaProduto = z.infer<
	typeof camposAlteracaoEmMassaProdutoSchema
>;

export const alterarProdutosEmMassaBodySchema = z.object({
	idempresa: z.string().uuid(),
	ids: z
		.array(z.string().uuid())
		.min(1, "Selecione ao menos um produto")
		.max(
			LIMITE_ALTERACAO_EM_MASSA_PRODUTOS,
			`É possível alterar no máximo ${LIMITE_ALTERACAO_EM_MASSA_PRODUTOS} produtos por vez`,
		),
	campos: camposAlteracaoEmMassaProdutoSchema,
});

function formatarValorMonetario(
	valor: string | number | null | undefined,
): string | null | undefined {
	if (valor === undefined) return undefined;
	if (valor === null) return null;
	return typeof valor === "number" ? valor.toFixed(2) : valor;
}

export function prepararCamposAlteracaoEmMassaProduto(
	campos: CamposAlteracaoEmMassaProduto,
): Partial<NovoProduto> {
	const dados: Partial<NovoProduto> = {};

	for (const [chave, valor] of Object.entries(campos)) {
		if (valor === undefined) {
			continue;
		}

		(dados as Record<string, unknown>)[chave] = valor;
	}

	if (dados.preco !== undefined) {
		dados.preco = formatarValorMonetario(dados.preco) ?? dados.preco;
	}

	if (dados.custoaquisicao !== undefined) {
		dados.custoaquisicao = formatarValorMonetario(dados.custoaquisicao);
	}

	return dados;
}
