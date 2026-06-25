import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarEmpresaFiscalService,
	buscarEmpresaFiscalService,
} from "@/service/empresa-fiscal/buscar-empresa-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

const bodySchema = z.object({
	razaosocial: z.string().max(60).nullable().optional(),
	nomefantasia: z.string().max(60).nullable().optional(),
	inscricaoestadual: z.string().max(20).nullable().optional(),
	inscricaomunicipal: z.string().max(20).nullable().optional(),
	crt: z.number().int().min(1).max(4).nullable().optional(),
	cnae: z.string().max(7).nullable().optional(),
	indicadorie: z.number().int().nullable().optional(),
	logradouro: z.string().max(60).nullable().optional(),
	numero: z.string().max(10).nullable().optional(),
	complemento: z.string().max(60).nullable().optional(),
	bairro: z.string().max(60).nullable().optional(),
	cep: z.string().max(9).nullable().optional(),
	codigomunicipioibge: z.string().max(7).nullable().optional(),
	uf: z.string().length(2).nullable().optional(),
	codigopais: z.string().max(4).nullable().optional(),
	telefone: z.string().max(40).nullable().optional(),
	email: z.string().max(200).nullable().optional(),
	regimetributario: z
		.union([z.enum(["SN", "LP", "LR"]), z.literal(""), z.null()])
		.optional(),
});

export async function buscarEmpresaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);

		const resultado = await buscarEmpresaFiscalService({
			idempresa: id,
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

export async function atualizarEmpresaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);

		const resultado = await atualizarEmpresaFiscalService({
			idempresa: id,
			idusuario: request.user.id,
			dados: dados as Parameters<typeof atualizarEmpresaFiscalService>[0]["dados"],
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
