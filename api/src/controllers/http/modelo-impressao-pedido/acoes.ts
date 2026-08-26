import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarModeloImpressaoPedidoService,
	buscarModeloImpressaoPedidoService,
	criarModeloImpressaoPedidoService,
	definirPrimarioModeloImpressaoPedidoService,
	duplicarModeloImpressaoPedidoService,
	excluirModeloImpressaoPedidoService,
	listarModelosImpressaoPedidoService,
	seedModelosImpressaoPedidoService,
} from "@/service/modelo-impressao-pedido/gerenciar-modelo-impressao-pedido.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsEmpresaSchema = z.object({
	idempresa: z.string().uuid(),
});

const paramsIdSchema = z.object({
	idempresa: z.string().uuid(),
	id: z.string().uuid(),
});

const tiposBloco = z.enum([
	"cabecalhoEmpresa",
	"titulo",
	"textoLivre",
	"dadosPedido",
	"cliente",
	"observacao",
	"itens",
	"totais",
	"assinaturas",
	"rodape",
]);

const colunaBloco = z.enum(["cheia", "esquerda", "direita"]);

const blocoSchema = z.object({
	id: z.string().min(1),
	tipo: tiposBloco,
	coluna: colunaBloco.optional(),
	props: z
		.object({
			titulo: z.string().max(200).optional(),
			texto: z.string().max(5000).optional(),
			campos: z.array(z.string()).optional(),
		})
		.optional(),
});

const criarBodySchema = z.object({
	nome: z.string().min(1).max(120),
	descricao: z.string().max(255).nullable().optional(),
	layout: z.array(blocoSchema).default([]),
	primario: z.boolean().optional(),
});

const atualizarBodySchema = z.object({
	nome: z.string().min(1).max(120).optional(),
	descricao: z.string().max(255).nullable().optional(),
	layout: z.array(blocoSchema).optional(),
	primario: z.boolean().optional(),
	ativo: z.boolean().optional(),
});

function responderErroZod(reply: FastifyReply, error: unknown) {
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

export async function listarModelosImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const resultado = await listarModelosImpressaoPedidoService({
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function buscarModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await buscarModeloImpressaoPedidoService({
			id,
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function criarModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const body = criarBodySchema.parse(request.body);
		const resultado = await criarModeloImpressaoPedidoService({
			idempresa,
			idusuario: request.user.id,
			nome: body.nome,
			descricao: body.descricao,
			layout: body.layout,
			primario: body.primario,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function atualizarModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const body = atualizarBodySchema.parse(request.body);
		const resultado = await atualizarModeloImpressaoPedidoService({
			id,
			idempresa,
			idusuario: request.user.id,
			...body,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function excluirModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await excluirModeloImpressaoPedidoService({
			id,
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function definirPrimarioModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await definirPrimarioModeloImpressaoPedidoService({
			id,
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function duplicarModeloImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await duplicarModeloImpressaoPedidoService({
			id,
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}

export async function seedModelosImpressaoPedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const resultado = await seedModelosImpressaoPedidoService({
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErroZod(reply, error);
	}
}
