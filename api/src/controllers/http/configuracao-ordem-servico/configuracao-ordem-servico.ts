import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarConfiguracaoOrdemServicoService,
	buscarConfiguracaoOrdemServicoService,
} from "@/service/ordem-servico/configuracao/gerenciar-configuracao-ordem-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { ORDEM_SERVICO_CAMPOS_EXTRA } from "@/util/ordem-servico-constants.js";

const paramsSchema = z.object({
	idempresa: z.string().uuid(),
});

const campoExtraSchema = z.object({
	campo: z.enum(ORDEM_SERVICO_CAMPOS_EXTRA),
	nome: z.string().min(1).max(100),
	ativo: z.boolean(),
	obrigatorio: z.boolean(),
});

export async function buscarConfiguracaoOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsSchema.parse(request.params);
		const resultado = await buscarConfiguracaoOrdemServicoService({
			idempresa,
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

export async function atualizarConfiguracaoOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = paramsSchema.parse(request.params);
		const bodyRaw = z
			.object({
				agrupafinanceiroaofaturar: z.number().int().optional(),
				descricao: z.string().max(100).nullable().optional(),
				descricaocampochave: z.string().max(50).nullable().optional(),
				idcfopexternaproduto: z.string().uuid().nullable().optional(),
				idcfopexternaservico: z.string().uuid().nullable().optional(),
				idcfopexternaservicost: z.string().uuid().nullable().optional(),
				idcfopinternaproduto: z.string().uuid().nullable().optional(),
				idcfopinternaservico: z.string().uuid().nullable().optional(),
				idcfopinternaservicost: z.string().uuid().nullable().optional(),
				idmodelnfe: z.string().nullable().optional(),
				idmodelonfse: z.string().nullable().optional(),
				mascaracampochave: z.string().max(30).nullable().optional(),
				mostrarcamposfinalizaritem: z.number().int().optional(),
				pedirprimeiroobjeto: z.number().int().optional(),
				tecnicoobrigatorio: z.number().int().optional(),
				usadadosveiculo: z.number().int().min(0).max(1).optional(),
				camposextras: z.array(campoExtraSchema).max(16).optional(),
				camposExtras: z.array(campoExtraSchema).max(16).optional(),
			})
			.parse(request.body);

		const { camposExtras, ...rest } = bodyRaw;
		const body = {
			...rest,
			camposextras: rest.camposextras ?? camposExtras,
		};

		const resultado = await atualizarConfiguracaoOrdemServicoService({
			idempresa,
			idusuario: request.user.id,
			roles: request.user.roles,
			dados: body,
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
