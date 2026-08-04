import type { FastifyReply, FastifyRequest } from "fastify";
import {
	EntitlementAcessoNegadoError,
	usuarioTemFeature,
	usuarioTemModulo,
} from "@/service/planos/buscar-plano-efetivo.js";
import { obterIdEmpresaDoContexto } from "./resolve-empresa-context.js";

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
		const idempresa = obterIdEmpresaDoContexto(request);
		try {
			const ok = await usuarioTemFeature({
				idusuario: request.user.id,
				feature,
				...(idempresa
					? { idempresa, modo: "operacional" as const }
					: { modo: "direto" as const }),
			});
			if (!ok) {
				return reply.status(403).send({
					error: "Funcionalidade não disponível no seu plano",
					code: "PLAN_FEATURE_REQUIRED",
					feature,
				});
			}
		} catch (error) {
			if (error instanceof EntitlementAcessoNegadoError) {
				return reply.status(403).send({
					error: error.message,
					code: error.code,
				});
			}
			throw error;
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
		const idempresa = obterIdEmpresaDoContexto(request);
		try {
			const ok = await usuarioTemModulo({
				idusuario: request.user.id,
				modulo,
				...(idempresa
					? { idempresa, modo: "operacional" as const }
					: { modo: "direto" as const }),
			});
			if (!ok) {
				return reply.status(403).send({
					error: "Módulo não contratado",
					code: "MODULE_REQUIRED",
					modulo,
				});
			}
		} catch (error) {
			if (error instanceof EntitlementAcessoNegadoError) {
				return reply.status(403).send({
					error: error.message,
					code: error.code,
				});
			}
			throw error;
		}
	};
}
