import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarCardapioPublicoService } from "@/service/cardapio-delivery/buscar-cardapio-publico.js";
import { criarPedidoCardapioPublicoService } from "@/service/cardapio-delivery/criar-pedido-cardapio-publico.js";
import { listarMeusPedidosCardapioPublicoService } from "@/service/cardapio-delivery/listar-meus-pedidos-cardapio-publico.js";
import { lerImagemGrupoGourmetDaEmpresa } from "@/service/grupo-gourmet/imagem-grupo-gourmet.js";
import {
	ErroImagemProduto,
	lerImagemProdutoDaEmpresa,
} from "@/service/produto/imagem-produto.js";
import { buscarCardapioDeliveryPorSlug } from "@/repositories/cardapio-delivery-repositories.js";
import { httpErroInterno } from "@/util/http-util.js";

const slugParams = z.object({ slug: z.string().min(2).max(80) });
const produtoParams = slugParams.extend({ id: z.uuid() });
const grupoParams = slugParams.extend({ id: z.uuid() });

const pedidoBody = z.object({
	clientorderid: z.string().min(8).max(80),
	nomecliente: z.string().min(2).max(120),
	telefone: z.string().min(8).max(20),
	respostas: z
		.array(
			z.object({
				campoid: z.string().min(1),
				valor: z.string(),
			}),
		)
		.default([]),
	itens: z
		.array(
			z.object({
				idproduto: z.uuid(),
				quantidade: z.coerce.number().positive(),
				observacao: z.string().max(240).nullable().optional(),
				idprodutomeio: z.uuid().nullable().optional(),
			}),
		)
		.min(1),
});

export async function buscarCardapioPublico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug } = slugParams.parse(request.params);
		const resultado = await buscarCardapioPublicoService(slug);
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

export async function buscarProdutosCardapioPublico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug } = slugParams.parse(request.params);
		const resultado = await buscarCardapioPublicoService(slug);
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		if (!resultado.body) {
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
		return reply.status(resultado.status).send({
			grupos: resultado.body.grupos,
			produtos: resultado.body.produtos,
		});
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

export async function criarPedidoCardapioPublico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug } = slugParams.parse(request.params);
		const body = pedidoBody.parse(request.body);
		const resultado = await criarPedidoCardapioPublicoService({
			slug,
			clientorderid: body.clientorderid,
			nomecliente: body.nomecliente,
			telefone: body.telefone,
			respostas: body.respostas,
			itens: body.itens,
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

export async function listarMeusPedidosCardapioPublico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug } = slugParams.parse(request.params);
		const query = z
			.object({ telefone: z.string().min(8).max(30) })
			.parse(request.query);
		const resultado = await listarMeusPedidosCardapioPublicoService({
			slug,
			telefone: query.telefone,
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

async function resolverEmpresaDoSlug(slug: string) {
	const cardapio = await buscarCardapioDeliveryPorSlug(slug);
	if (!cardapio || cardapio.ativo !== 1) {
		throw new ErroImagemProduto("Imagem não encontrada", 404, "NOT_FOUND");
	}
	return cardapio.idempresa;
}

export async function downloadImagemProdutoCardapioPublica(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug, id } = produtoParams.parse(request.params);
		const idempresa = await resolverEmpresaDoSlug(slug);
		const imagem = await lerImagemProdutoDaEmpresa({
			idproduto: id,
			idempresa,
		});
		return reply
			.type(imagem.tipo)
			.header("Cache-Control", "public, max-age=86400")
			.header("ETag", `"${imagem.etag}"`)
			.send(imagem.conteudo);
	} catch (error) {
		if (error instanceof ErroImagemProduto) {
			return reply
				.status(error.status)
				.send({ error: error.message, code: error.codigo });
		}
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function downloadImagemGrupoCardapioPublica(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug, id } = grupoParams.parse(request.params);
		const idempresa = await resolverEmpresaDoSlug(slug);
		const imagem = await lerImagemGrupoGourmetDaEmpresa({
			id,
			idempresa,
		});
		return reply
			.type(imagem.tipo)
			.header("Cache-Control", "public, max-age=86400")
			.header("ETag", `"${imagem.etag}"`)
			.send(imagem.conteudo);
	} catch (error) {
		if (error instanceof ErroImagemProduto) {
			return reply
				.status(error.status)
				.send({ error: error.message, code: error.codigo });
		}
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
