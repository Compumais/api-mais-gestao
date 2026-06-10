import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buscarPlanoEfetivoService } from "@/service/planos/buscar-plano-efetivo.js";

const querySchema = z.object({
	idempresa: z.string().uuid().optional(),
});

export async function getMeuPlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	try {
		const query = querySchema.safeParse(request.query);
		const idempresa = query.success ? query.data.idempresa : undefined;

		const resultado = await buscarPlanoEfetivoService({
			idusuario: request.user.id,
			...(idempresa && { idempresa }),
		});

		if (resultado.status === "SEM_PLANO") {
			return reply.status(200).send({
				plano: null,
				planoAgendado: null,
				inicioCiclo: null,
				fimCiclo: null,
				status: "SEM_PLANO",
				mensagem: resultado.mensagem ?? "Usuário não possui plano ativo",
			});
		}

		return reply.status(200).send({
			plano: resultado.plano,
			planoAgendado: resultado.planoAgendado,
			inicioCiclo: resultado.inicioCiclo,
			fimCiclo: resultado.fimCiclo,
			status: "ACTIVE",
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Erro ao buscar plano do usuário:", error);
		return reply.status(500).send({
			message: "Erro ao buscar plano",
			error: message,
		});
	}
}
