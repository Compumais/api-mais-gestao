import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarContasReceberOrdemServicoService } from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import { gerarNfeRascunhoOrdemServicoService } from "@/service/ordem-servico/gerar-nfe-rascunho-ordem-servico.js";
import { listarEventosOrdemServicoService } from "@/service/ordem-servico/listar-eventos-ordem-servico.js";
import { listarFaturamentosOrdemServicoService } from "@/service/ordem-servico/listar-faturamentos-ordem-servico.js";
import { prepararNfseOrdemServicoService } from "@/service/ordem-servico/preparar-nfse-ordem-servico.js";
import { registrarEventoOrdemServicoService } from "@/service/ordem-servico/registrar-evento-ordem-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsOsSchema = z.object({ id: z.string().uuid() });
const empresaSchema = z.object({ idempresa: z.string().uuid() });

function tratarErro(error: unknown, reply: FastifyReply) {
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

export async function listarEventosOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await listarEventosOrdemServicoService({
			ordemServicoId: id,
			idempresa,
			idusuario: request.user.id,
		});
		if (resultado.success === false) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function criarEventoOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				idtipoevento: z.string().uuid(),
				descricao: z.string().min(1),
				idtecnicode: z.string().min(1).optional(),
				idtecnicopara: z.string().min(1).optional(),
				nomecontato: z.string().max(50).optional(),
			})
			.parse(request.body);

		const resultado = await registrarEventoOrdemServicoService({
			ordemServicoId: id,
			idusuario: request.user.id,
			...body,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function listarFaturamentosOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await listarFaturamentosOrdemServicoService({
			ordemServicoId: id,
			idempresa,
			idusuario: request.user.id,
		});
		if (resultado.success === false) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function gerarContasReceberOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				formasPagamento: z
					.array(
						z.object({
							idtipodocumentofinanceiro: z.string().uuid(),
							valor: z.number().positive(),
							indPag: z.number().int().optional(),
						}),
					)
					.optional(),
			})
			.parse(request.body);

		const resultado = await gerarContasReceberOrdemServicoService({
			ordemServicoId: id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			formasPagamento: body.formasPagamento,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function gerarNfeRascunhoOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				idserienfe: z.string().uuid().optional(),
				formasPagamento: z
					.array(
						z.object({
							idtipodocumentofinanceiro: z.string().uuid(),
							valor: z.number().positive(),
							indPag: z.number().int().optional(),
						}),
					)
					.optional(),
			})
			.parse(request.body);

		const resultado = await gerarNfeRascunhoOrdemServicoService({
			ordemServicoId: id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idserienfe: body.idserienfe,
			formasPagamento: body.formasPagamento,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function prepararNfseOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				formasPagamento: z
					.array(
						z.object({
							idtipodocumentofinanceiro: z.string().uuid(),
							valor: z.number().positive(),
							indPag: z.number().int().optional(),
						}),
					)
					.optional(),
			})
			.parse(request.body);

		const resultado = await prepararNfseOrdemServicoService({
			ordemServicoId: id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			formasPagamento: body.formasPagamento,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}
