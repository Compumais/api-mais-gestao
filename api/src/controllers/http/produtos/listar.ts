import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_PRODUTOS_CAMPOS } from "@/repositories/produtos-repositories.js";
import { listarProdutosService } from "@/service/produto/listar-produtos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarProdutosQuerySchema = z.object({
	idempresa: z.string(),
	nome: textoOpcional,
	q: textoOpcional,
	inativo: z.coerce.number().int().min(0).max(1).optional(),
	tipo: z.enum(["P", "S"]).optional(),
	codigo: textoOpcional,
	ean: textoOpcional,
	referencia: textoOpcional,
	ncm: textoOpcional,
	unidademedida: textoOpcional,
	tipoproduto: textoOpcional,
	fornecedor: textoOpcional,
	preco: textoOpcional,
	custoaquisicao: textoOpcional,
	datacadastro: textoOpcional,
	ordenarPor: z.enum(ORDENAR_PRODUTOS_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarProdutos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarProdutosQuerySchema.parse(request.query);

		const resultado = await listarProdutosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			nome: query.nome,
			q: query.q,
			inativo: query.inativo,
			tipo: query.tipo,
			codigo: query.codigo,
			ean: query.ean,
			referencia: query.referencia,
			ncm: query.ncm,
			unidademedida: query.unidademedida,
			tipoproduto: query.tipoproduto,
			fornecedor: query.fornecedor,
			preco: query.preco,
			custoaquisicao: query.custoaquisicao,
			datacadastro: query.datacadastro,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
			page: query.page,
			limit: query.limit,
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
