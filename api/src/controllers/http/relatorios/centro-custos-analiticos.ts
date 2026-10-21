import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { REGIME_APROPRIACAO } from "@/constants/centro-custo.js";
import {
	buscarComparativoMensalCentroCustos,
	buscarComposicaoCentroCustos,
	buscarEvolucaoCentroCustos,
	buscarRateiosCentroCustos,
	buscarTotaisCentroCustosPorPeriodo,
} from "@/repositories/centro-custo-relatorios-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido } from "@/util/http-util.js";

const filtroSchema = z.object({
	idempresa: z.string(),
	dataInicio: z.string(),
	dataFim: z.string(),
	regime: z
		.enum([REGIME_APROPRIACAO.COMPETENCIA, REGIME_APROPRIACAO.CAIXA])
		.default(REGIME_APROPRIACAO.COMPETENCIA),
	idcentrocusto: z.string().optional(),
});

async function validarEmpresa(request: FastifyRequest, idempresa: string) {
	if (!request.user) return httpNaoAutorizado();
	const permitido = await verificarUsuarioPertenceEmpresa(
		request.user.id,
		idempresa,
	);
	if (!permitido) return httpProibido();
	return null;
}

export async function centroCustosDespesasController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = filtroSchema.parse(request.query);
		const erro = await validarEmpresa(request, query.idempresa);
		if (erro) return reply.status(erro.status).send(erro);
		const data = await buscarTotaisCentroCustosPorPeriodo(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function centroCustosComparativoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = filtroSchema.parse(request.query);
		const erro = await validarEmpresa(request, query.idempresa);
		if (erro) return reply.status(erro.status).send(erro);
		const data = await buscarComparativoMensalCentroCustos(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function centroCustosComposicaoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = filtroSchema.parse(request.query);
		const erro = await validarEmpresa(request, query.idempresa);
		if (erro) return reply.status(erro.status).send(erro);
		const data = await buscarComposicaoCentroCustos(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function centroCustosRateiosController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = filtroSchema.parse(request.query);
		const erro = await validarEmpresa(request, query.idempresa);
		if (erro) return reply.status(erro.status).send(erro);
		const data = await buscarRateiosCentroCustos(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function centroCustosEvolucaoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = z
			.object({
				idempresa: z.string(),
				regime: z
					.enum([REGIME_APROPRIACAO.COMPETENCIA, REGIME_APROPRIACAO.CAIXA])
					.default(REGIME_APROPRIACAO.COMPETENCIA),
				meses: z.coerce.number().min(1).max(36).default(12),
				idcentrocusto: z.string().optional(),
			})
			.parse(request.query);
		const erro = await validarEmpresa(request, query.idempresa);
		if (erro) return reply.status(erro.status).send(erro);
		const data = await buscarEvolucaoCentroCustos(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
