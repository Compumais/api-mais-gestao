import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioPertenceEmpresa } from "src/repositories/entidade-repositories";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarProdutoService } from "@/service/produto/criar-produto.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const criarProdutoBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.number().int().positive(),
	ean: z.number().int().optional().nullable(),
	referencia: z.string().max(60).optional().nullable(),
	nome: z.string().min(1).max(120),
	idunidademedida: z.string(),
	fornecedor: z.string().optional().nullable(),
	idgrupo: z.string(),
	preco: z.union([z.string(), z.number()]),
	tipo: z.enum(["P", "S"]).default("P"),
	iat: z.enum(["A", "T"]).optional().nullable(),
	ippt: z.enum(["P", "T"]),
	origem: z.number().int().min(0).max(2),
	ncm: z.string().min(1).max(10),
	observacoes: z.string().optional().nullable(),
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
			idgrupo: dadosValidados.idgrupo,
			preco,
			tipo: dadosValidados.tipo,
			iat: dadosValidados.iat ?? null,
			ippt: dadosValidados.ippt,
			origem: dadosValidados.origem,
			ncm: dadosValidados.ncm,
			observacoes: dadosValidados.observacoes ?? null,
			inativo: 0,
		};

		const resultado = await criarProdutoService({
			dadosProduto,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
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
