import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buscarEntitlementService } from "@/service/planos/buscar-plano-efetivo.js";

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

		const resultado = await buscarEntitlementService({
			idusuario: request.user.id,
			...(idempresa && { idempresa }),
		});

		return reply.status(200).send({
			plano: resultado.plano,
			planoAgendado: resultado.planoAgendado,
			inicioCiclo: resultado.inicioCiclo,
			fimCiclo: resultado.fimCiclo,
			status: resultado.status,
			limites: resultado.limites,
			features: resultado.features,
			modulos: resultado.modulos,
			valor: resultado.valor,
			nomePlano: resultado.nomePlano,
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
