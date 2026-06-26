import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import z from "zod";
import type { NovoProduto } from "@/model/produto-model.js";
import { atualizarProdutoService } from "@/service/produto/atualizar-produto.js";
import { enriquecerCamposImpostosProduto } from "@/service/produto/enriquecer-campos-impostos-produto.js";
import { sincronizarSaldoEstoqueProduto } from "@/service/produto/sincronizar-saldo-estoque-produto.js";
import { camposImpostosProdutoSchema } from "@/util/campos-impostos-produto.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const atualizarProdutoParamsSchema = z.object({
	id: z.string(),
});

const atualizarProdutoQuerySchema = z.object({
	idempresa: z.string(),
});

const atualizarProdutoBodySchema = z.object({
	codigo: z.number().int().positive().optional(),
	ean: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) => {
			if (valor === null || valor === undefined) return null;
			const digitos = String(valor).replace(/\D/g, "");
			return digitos.length > 0 ? digitos : null;
		}),
	referencia: z.string().max(60).optional().nullable(),
	nome: z.string().min(1).max(120).optional(),
	idunidademedida: z.string().optional(),
	fornecedor: z.string().optional().nullable(),
	idgrupo: z.string().optional(),
	preco: z.union([z.string(), z.number()]).optional(),
	tipo: z.enum(["P", "S"]).optional(),
	iat: z.enum(["A", "T"]).optional().nullable(),
	ippt: z.enum(["P", "T"]).optional(),
	origem: z.number().int().min(0).max(8).optional(),
	ncm: z.string().min(1).max(10).optional(),
	observacoes: z.string().optional().nullable(),
	enviamobile: z.number().int().min(0).max(1).optional(),
	quantidadepadrao: z.number().int().min(0).optional().nullable(),
	quantidademinima: z.number().int().min(0).optional().nullable(),
	quantidademaxima: z.number().int().positive().optional().nullable(),
	custoaquisicao: z.union([z.string(), z.number()]).optional().nullable(),
	estoque: z.number().min(0).optional(),
	...camposImpostosProdutoSchema,
});

export async function atualizarProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarProdutoParamsSchema.parse(request.params);
		const { idempresa } = atualizarProdutoQuerySchema.parse(request.query);
		const dadosValidados = atualizarProdutoBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido().success);
		}

		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				([chave, valor]) =>
					valor !== undefined && chave !== "estoque",
			),
		) as Partial<NovoProduto>;

		if (dadosValidados.preco !== undefined) {
			dados.preco =
				typeof dadosValidados.preco === "number"
					? dadosValidados.preco.toFixed(2)
					: dadosValidados.preco;
		}

		if (dadosValidados.custoaquisicao !== undefined) {
			dados.custoaquisicao =
				dadosValidados.custoaquisicao == null
					? null
					: typeof dadosValidados.custoaquisicao === "number"
						? dadosValidados.custoaquisicao.toFixed(2)
						: dadosValidados.custoaquisicao;
		}

		if (dadosValidados.nome !== undefined) {
			dados.descricao = dadosValidados.nome.slice(0, 100);
		}

		const camposImpostosInformados = Object.keys(camposImpostosProdutoSchema).some(
			(campo) =>
				campo in dadosValidados &&
				dadosValidados[campo as keyof typeof dadosValidados] !== undefined,
		);

		if (camposImpostosInformados) {
			const impostos = await enriquecerCamposImpostosProduto(dadosValidados);
			Object.assign(dados, impostos);
		}

		const resultado = await atualizarProdutoService({
			produtoId: id,
			idusuario: request.user.id,
			dados,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		const quantidadeSaldo =
			dadosValidados.estoque ?? dadosValidados.quantidadepadrao;

		if (quantidadeSaldo != null && resultado.body) {
			await sincronizarSaldoEstoqueProduto({
				idempresa,
				produto: resultado.body,
				quantidade: quantidadeSaldo,
			});
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
