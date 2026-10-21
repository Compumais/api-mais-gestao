import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { REGIME_APROPRIACAO } from "@/constants/centro-custo.js";
import {
	atualizarBudgetCentroCusto,
	buscarBudgetCentroCustoPorId,
	excluirBudgetCentroCusto,
} from "@/repositories/budget-centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { acompanhamentoBudgetCentroCustoService } from "@/service/budgets-centro-custo/acompanhamento-budget-centro-custo.js";
import { criarBudgetCentroCustoService } from "@/service/budgets-centro-custo/criar-budget-centro-custo.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido, httpSemConteudo } from "@/util/http-util.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";

export async function budgetsCentroCustoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/budgets-centro-custo", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const body = z
				.object({
					idempresa: z.string(),
					idcentrocusto: z.string(),
					idplanocontas: z.string().optional().nullable(),
					ano: z.coerce.number().int(),
					periodicidade: z.enum(["M", "A"]),
					mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
					valor: z.coerce.number().positive(),
				})
				.parse(request.body);
			const resultado = await criarBudgetCentroCustoService({
				idusuario: request.user.id,
				dados: {
					id: uuidv4(),
					...body,
					valor: body.valor.toFixed(2),
					idplanocontas: body.idplanocontas ?? null,
					mes: body.mes ?? null,
				},
			});
			if (!resultado.success) {
				return reply.status(resultado.status).send(resultado);
			}
			return reply.status(resultado.status).send(resultado.body);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.get("/budgets-centro-custo/acompanhamento", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const query = z
				.object({
					idempresa: z.string(),
					ano: z.coerce.number().int(),
					mes: z.coerce.number().int().min(1).max(12).optional(),
					regime: z
						.enum([REGIME_APROPRIACAO.CAIXA, REGIME_APROPRIACAO.COMPETENCIA])
						.default(REGIME_APROPRIACAO.COMPETENCIA),
				})
				.parse(request.query);
			const resultado = await acompanhamentoBudgetCentroCustoService({
				idusuario: request.user.id,
				...query,
			});
			if (!resultado.success) {
				return reply.status(resultado.status).send(resultado);
			}
			return reply.status(resultado.status).send(resultado.body);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.put("/budgets-centro-custo/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { id } = z.object({ id: z.string() }).parse(request.params);
			const body = z
				.object({
					idempresa: z.string(),
					valor: z.coerce.number().positive().optional(),
					periodicidade: z.enum(["M", "A"]).optional(),
					mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
				})
				.parse(request.body);
			const permitido = await verificarUsuarioPertenceEmpresa(
				request.user.id,
				body.idempresa,
			);
			if (!permitido) {
				return reply.status(httpProibido().status).send(httpProibido());
			}
			const registro = await atualizarBudgetCentroCusto(id, {
				valor: body.valor?.toFixed(2),
				periodicidade: body.periodicidade,
				mes: body.mes ?? null,
				currenttimemillis: Date.now(),
			});
			return reply.status(200).send(registro);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.delete("/budgets-centro-custo/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { id } = z.object({ id: z.string() }).parse(request.params);
			const existente = await buscarBudgetCentroCustoPorId(id);
			if (!existente) {
				return reply.status(404).send({ error: "Orçamento não encontrado" });
			}
			const permitido = await verificarUsuarioPertenceEmpresa(
				request.user.id,
				existente.idempresa,
			);
			if (!permitido) {
				return reply.status(httpProibido().status).send(httpProibido());
			}
			await excluirBudgetCentroCusto(id);
			const resp = httpSemConteudo();
			return reply.status(resp.status).send();
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});
}
