import { z } from "zod";
import type { NovoProduto } from "@/model/produto-model.js";
import {
	camposImpostosProdutoSchema,
	refinirCamposIbsCbsProduto,
} from "@/util/campos-impostos-produto.js";
import { camposServicoProdutoSchema } from "@/util/campos-servico-produto.js";
import {
	normalizarCodigoAnp,
	normalizarPercentualBiodiesel,
} from "@/util/cfop-combustivel.js";

export const LIMITE_ALTERACAO_EM_MASSA_PRODUTOS = 500;

export const camposAlteracaoEmMassaProdutoSchema = z
	.object({
		...camposImpostosProdutoSchema,
		idgrupo: z.string().uuid().optional().nullable(),
		idgrupogourmet: z
			.string()
			.optional()
			.nullable()
			.transform((valor) => {
				if (valor === undefined) return undefined;
				if (!valor || valor === "none") return null;
				return valor;
			}),
		espizza: z.number().int().min(0).max(1).optional(),
		idunidademedida: z.string().uuid().optional(),
		idlocalestoque: z
			.string()
			.optional()
			.nullable()
			.transform((valor) => {
				if (valor === undefined) return undefined;
				if (!valor || valor === "none" || valor.trim() === "") return null;
				return valor;
			}),
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
		derivadopetroleo: z.number().int().min(0).max(1).optional(),
		codigoanp: z
			.string()
			.optional()
			.nullable()
			.refine(
				(valor) =>
					valor == null ||
					valor.trim() === "" ||
					/^\d{9}$/.test(valor.replace(/\D/g, "")),
				"Código ANP deve ter 9 dígitos",
			),
		descricaoanp: z.string().max(95).optional().nullable(),
		percentualbiodiesel: z
			.union([z.string(), z.number()])
			.optional()
			.nullable()
			.refine((valor) => {
				if (valor == null || String(valor).trim() === "") return true;
				const numero = Number(String(valor).replace(",", "."));
				return Number.isFinite(numero) && numero >= 0 && numero <= 100;
			}, "Percentual de biodiesel deve ficar entre 0 e 100"),
		ippt: z.enum(["P", "T"]).optional().nullable(),
		inativo: z.number().int().min(0).max(1).optional().nullable(),
		controlalote: z.number().int().min(0).max(1).optional(),
		controlavalidade: z.number().int().min(0).max(1).optional(),
		tipoproduto: z.string().max(2).optional().nullable(),
		aliquotapis: camposServicoProdutoSchema.aliquotapis,
		aliquotacofins: camposServicoProdutoSchema.aliquotacofins,
	})
	.refine(
		(campos) => Object.values(campos).some((valor) => valor !== undefined),
		{ message: "Selecione ao menos um campo para alterar" },
	)
	.superRefine((campos, ctx) => {
		if (campos.cstibs !== undefined || campos.classtributariaibs !== undefined) {
			refinirCamposIbsCbsProduto(campos, ctx);
		}
	});

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

	if (dados.derivadopetroleo === 0) {
		dados.codigoanp = null;
		dados.descricaoanp = null;
		dados.percentualbiodiesel = null;
	} else {
		if (dados.codigoanp !== undefined) {
			const codigo = normalizarCodigoAnp(dados.codigoanp);
			if (codigo && codigo.length === 9) {
				dados.codigoanp = codigo;
			} else {
				delete dados.codigoanp;
			}
		}
		if (dados.descricaoanp !== undefined) {
			const texto = dados.descricaoanp?.trim().slice(0, 95);
			if (texto) {
				dados.descricaoanp = texto;
			} else {
				delete dados.descricaoanp;
			}
		}
		if (dados.percentualbiodiesel !== undefined) {
			const percentual = normalizarPercentualBiodiesel(
				dados.percentualbiodiesel,
			);
			if (percentual) {
				dados.percentualbiodiesel = percentual;
			} else {
				delete dados.percentualbiodiesel;
			}
		}
	}

	return dados;
}
