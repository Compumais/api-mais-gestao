import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { criarBudgetService } from "@/service/budgets/criar-budget.js";
import { excluirBudgetService } from "@/service/budgets/excluir-budget.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarBudgetBodySchema = z.object({
	idempresa: z.string(),
	idplanocontas: z.string(),
	ano: z.coerce.number().int().min(2000).max(2100),
	periodicidade: z.enum(["M", "A"]),
	mes: z.coerce.number().int().min(1).max(12).nullish(),
	valor: z.coerce.number().positive(),
});

export async function criarBudget(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarBudgetBodySchema.parse(request.body);

		const dadosBudget = {
			id: uuidv4(),
			idempresa: dadosValidados.idempresa,
			idplanocontas: dadosValidados.idplanocontas,
			ano: dadosValidados.ano,
			periodicidade: dadosValidados.periodicidade,
			mes: dadosValidados.mes ?? null,
			valor: dadosValidados.valor.toFixed(2),
		};

		const budget = await criarBudgetService({
			idusuario: request.user.id,
			dadosBudget,
		});

		if (!budget.success) {
			return reply.status(budget.status).send(budget);
		}

		const auditoriaId = uuidv4();

		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			idusuario: request.user.id,
			acao: "criar_budget",
			recurso: "budget",
			criadoem: new Date().toISOString(),
			metadados: {
				idbudget: budget.body?.id ?? "",
				idplanocontas: budget.body?.idplanocontas ?? "",
				ano: budget.body?.ano ?? "",
				valor: budget.body?.valor ?? "",
			},
		});

		if (!auditoria) {
			await excluirBudgetService({
				id: budget.body!.id!,
				idusuario: request.user.id,
			});

			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		return reply.status(budget.status).send(budget.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
