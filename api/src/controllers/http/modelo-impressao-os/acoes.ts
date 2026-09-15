import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarModeloImpressaoOsService,
	buscarModeloImpressaoOsService,
	criarModeloImpressaoOsService,
	definirPrimarioModeloImpressaoOsService,
	duplicarModeloImpressaoOsService,
	excluirModeloImpressaoOsService,
	listarModelosImpressaoOsService,
	seedModelosImpressaoOsService,
} from "@/service/modelo-impressao-os/gerenciar-modelo-impressao-os.js";
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
	"dadosOs",
	"cliente",
	"veiculo",
	"problema",
	"laudo",
	"servicoRealizado",
	"observacao",
	"itens",
	"totais",
	"extras",
	"personalizado",
	"assinaturas",
	"rodape",
]);

const colunaBloco = z.enum(["cheia", "esquerda", "direita"]);

const campoPersonalizadoSchema = z.object({
	id: z.string().min(1),
	tipo: z.enum(["assinatura", "data", "observacao", "textoFixo", "status"]),
	rotulo: z.string().max(120),
	valor: z.string().max(5000).optional(),
	coluna: colunaBloco.default("cheia"),
});

const blocoSchema = z.object({
	id: z.string().min(1),
	tipo: tiposBloco,
	coluna: colunaBloco.optional(),
	props: z
		.object({
			titulo: z.string().max(200).optional(),
			texto: z.string().max(5000).optional(),
			campos: z.array(z.string()).optional(),
			mostrarResponsavel: z.boolean().optional(),
			tituloSecao: z.string().max(200).optional(),
			camposPersonalizados: z.array(campoPersonalizadoSchema).optional(),
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

export async function listarModelosImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const resultado = await listarModelosImpressaoOsService({
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

export async function buscarModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await buscarModeloImpressaoOsService({
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

export async function criarModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const body = criarBodySchema.parse(request.body);
		const resultado = await criarModeloImpressaoOsService({
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

export async function atualizarModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const body = atualizarBodySchema.parse(request.body);
		const resultado = await atualizarModeloImpressaoOsService({
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

export async function excluirModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await excluirModeloImpressaoOsService({
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

export async function definirPrimarioModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await definirPrimarioModeloImpressaoOsService({
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

export async function duplicarModeloImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa, id } = paramsIdSchema.parse(request.params);
		const resultado = await duplicarModeloImpressaoOsService({
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

export async function seedModelosImpressaoOs(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsEmpresaSchema.parse(request.params);
		const resultado = await seedModelosImpressaoOsService({
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
