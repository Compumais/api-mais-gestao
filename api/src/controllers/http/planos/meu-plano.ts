import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	buscarEntitlementService,
	EntitlementAcessoNegadoError,
} from "@/service/planos/buscar-plano-efetivo.js";
import { obterIdEmpresaDoContexto } from "../../middleware/resolve-empresa-context.js";

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
		const idempresaQuery = query.success ? query.data.idempresa : undefined;
		const idempresa = obterIdEmpresaDoContexto(request) ?? idempresaQuery;

		const resultado = await buscarEntitlementService({
			idusuario: request.user.id,
			...(idempresa
				? { idempresa, modo: "operacional" as const }
				: { modo: "direto" as const }),
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
			idempresa: resultado.idempresa,
			idproprietario: resultado.idproprietario,
		});
	} catch (error: unknown) {
		if (error instanceof EntitlementAcessoNegadoError) {
			return reply.status(403).send({
				message: error.message,
				code: error.code,
			});
		}
		const message = error instanceof Error ? error.message : String(error);
		console.error("Erro ao buscar plano do usuário:", error);
		return reply.status(500).send({
			message: "Erro ao buscar plano",
			error: message,
		});
	}
}
