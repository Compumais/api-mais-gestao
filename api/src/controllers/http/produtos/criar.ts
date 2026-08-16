import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarProdutoService } from "@/service/produto/criar-produto.js";
import { enriquecerCamposImpostosProduto } from "@/service/produto/enriquecer-campos-impostos-produto.js";
import { sincronizarSaldoEstoqueProduto } from "@/service/produto/sincronizar-saldo-estoque-produto.js";
import { camposImpostosProdutoSchema } from "@/util/campos-impostos-produto.js";
import {
	camposServicoProdutoSchema,
	montarCamposServicoProduto,
} from "@/util/campos-servico-produto.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const criarProdutoBodySchema = z
	.object({
		idempresa: z.string(),
		codigo: z.number().int().positive(),
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
		nome: z.string().min(1).max(120),
		idunidademedida: z.string(),
		fornecedor: z.string().optional().nullable(),
		idgrupo: z.string().optional().nullable(),
		idgrupogourmet: z
			.string()
			.optional()
			.nullable()
			.transform((valor) => {
				if (!valor || valor === "none") return null;
				return valor;
			}),
		preco: z.union([z.string(), z.number()]),
		tipo: z.enum(["P", "S"]).default("P"),
		iat: z.enum(["A", "T"]).optional().nullable(),
		ippt: z.enum(["P", "T"]).optional().nullable(),
		origem: z.number().int().min(0).max(8).optional().nullable(),
		ncm: z.string().max(10).optional().nullable(),
		tipoproduto: z.string().max(2).optional().nullable(),
		observacoes: z.string().optional().nullable(),
		enviamobile: z.number().int().min(0).max(1).optional(),
		espizza: z.number().int().min(0).max(1).optional(),
		quantidadepadrao: z.number().int().min(0).optional().nullable(),
		quantidademinima: z.number().int().min(0).optional().nullable(),
		quantidademaxima: z.number().int().positive().optional().nullable(),
		custoaquisicao: z.union([z.string(), z.number()]).optional().nullable(),
		estoque: z.number().min(0).optional(),
		...camposImpostosProdutoSchema,
		...camposServicoProdutoSchema,
	})
	.superRefine((dados, ctx) => {
		if (dados.tipo === "S") return;
		if (!dados.idgrupo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Grupo é obrigatório",
				path: ["idgrupo"],
			});
		}
		if (!dados.ippt) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "IPPT é obrigatório",
				path: ["ippt"],
			});
		}
		if (dados.origem == null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Origem é obrigatória",
				path: ["origem"],
			});
		}
		if (!dados.ncm?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "NCM é obrigatório",
				path: ["ncm"],
			});
		}
	});

export async function criarProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarProdutoBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			dadosValidados.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido().success);
		}

		const preco =
			typeof dadosValidados.preco === "number"
				? dadosValidados.preco.toFixed(2)
				: dadosValidados.preco;

		const custoaquisicao =
			dadosValidados.custoaquisicao == null
				? null
				: typeof dadosValidados.custoaquisicao === "number"
					? dadosValidados.custoaquisicao.toFixed(2)
					: dadosValidados.custoaquisicao;

		const impostos = await enriquecerCamposImpostosProduto(dadosValidados);
		const camposServico = montarCamposServicoProduto(dadosValidados);
		const ehServico = dadosValidados.tipo === "S";

		const dadosProduto = {
			id: uuidv4(),
			idempresa: dadosValidados.idempresa,
			codigo: dadosValidados.codigo,
			ean: dadosValidados.ean ?? null,
			referencia: dadosValidados.referencia ?? null,
			nome: dadosValidados.nome,
			descricao: dadosValidados.nome.slice(0, 100),
			idunidademedida: dadosValidados.idunidademedida,
			fornecedor: dadosValidados.fornecedor ?? null,
			idgrupo: dadosValidados.idgrupo ?? null,
			idgrupogourmet: dadosValidados.idgrupogourmet ?? null,
			preco,
			tipo: dadosValidados.tipo,
			iat: dadosValidados.iat ?? null,
			ippt: dadosValidados.ippt ?? (ehServico ? "T" : "P"),
			origem: dadosValidados.origem ?? (ehServico ? 0 : 0),
			ncm: dadosValidados.ncm?.trim() || (ehServico ? null : ""),
			tipoproduto:
				dadosValidados.tipoproduto ?? (ehServico ? "09" : null),
			observacoes: dadosValidados.observacoes ?? null,
			enviamobile: dadosValidados.enviamobile ?? 0,
			espizza: dadosValidados.espizza ?? 0,
			quantidadepadrao: ehServico
				? 0
				: (dadosValidados.quantidadepadrao ?? 0),
			quantidademinima: ehServico
				? null
				: (dadosValidados.quantidademinima ?? null),
			quantidademaxima: ehServico
				? null
				: (dadosValidados.quantidademaxima ?? null),
			custoaquisicao,
			...impostos,
			...Object.fromEntries(
				Object.entries(camposServico).filter(([, valor]) => valor != null),
			),
			inativo: camposServico.inativo ?? 0,
		};

		const resultado = await criarProdutoService({
			dadosProduto,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!ehServico) {
			const quantidadeSaldo =
				dadosValidados.estoque ?? dadosValidados.quantidadepadrao;

			if (quantidadeSaldo != null && resultado.body) {
				await sincronizarSaldoEstoqueProduto({
					idempresa: dadosValidados.idempresa,
					produto: resultado.body,
					quantidade: quantidadeSaldo,
				});
			}
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
