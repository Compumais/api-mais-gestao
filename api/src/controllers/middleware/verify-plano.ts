import type { FastifyReply, FastifyRequest } from "fastify";
import {
	usuarioTemFeature,
	usuarioTemModulo,
} from "@/service/planos/buscar-plano-efetivo.js";

function extrairIdEmpresa(request: FastifyRequest): string | undefined {
	const params = request.params as Record<string, string> | undefined;
	const body = request.body as Record<string, unknown> | undefined;
	const query = request.query as Record<string, string> | undefined;
	const deParams = params?.idempresa;
	const deBody =
		typeof body?.idempresa === "string" ? body.idempresa : undefined;
	const deQuery = query?.idempresa;
	return deParams || deBody || deQuery;
}

export async function verifyPlano(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}
}

export function requireFeature(feature: string) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}
		const idempresa = extrairIdEmpresa(request);
		const ok = await usuarioTemFeature({
			idusuario: request.user.id,
			feature,
			...(idempresa && { idempresa }),
		});
		if (!ok) {
			return reply.status(403).send({
				error: "Funcionalidade não disponível no seu plano",
				code: "PLAN_FEATURE_REQUIRED",
				feature,
			});
		}
	};
}

export function requireModulo(modulo: string) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}
		const idempresa = extrairIdEmpresa(request);
		const ok = await usuarioTemModulo({
			idusuario: request.user.id,
			modulo,
			...(idempresa && { idempresa }),
		});
		if (!ok) {
			return reply.status(403).send({
				error: "Módulo não contratado",
				code: "MODULE_REQUIRED",
				modulo,
			});
		}
	};
}
