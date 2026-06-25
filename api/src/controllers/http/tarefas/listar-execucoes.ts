import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listarExecucoesTarefasService } from "@/service/tarefas/listar-execucoes.js";

const querySchema = z.object({
	idempresa: z.string().uuid().optional(),
	tipo: z
		.enum([
			"alerta_vencimento",
			"saldo_baixo",
			"conciliacao_pendente",
			"relatorios_automaticos",
			"verificar_ciclos_plano",
		])
		.optional(),
	limit: z.coerce.number().min(1).max(100).default(20),
});

export async function listarExecucoesTarefasHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	const query = querySchema.safeParse(request.query);
	if (!query.success) {
		return reply.status(400).send({
			error: "Parâmetros inválidos",
			code: "VALIDATION_ERROR",
			details: query.error.flatten(),
		});
	}

	const resultado = await listarExecucoesTarefasService({
		idusuario: request.user.id,
		limit: query.data.limit,
		...(query.data.idempresa && { idempresa: query.data.idempresa }),
		...(query.data.tipo && { tipo: query.data.tipo }),
	});

	if (!resultado.success) {
		return reply.status(resultado.status).send(resultado);
	}

	return reply.status(resultado.status).send(resultado.body);
}
