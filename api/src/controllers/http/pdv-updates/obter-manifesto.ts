import type { FastifyReply, FastifyRequest } from "fastify";
import { obterManifestoUpdatePdvService } from "@/service/pdv-updates/obter-manifesto-update-pdv.js";

export async function obterManifestoUpdatePdv(
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const resultado = await obterManifestoUpdatePdvService();
		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}
		reply.header("Cache-Control", "no-cache");
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro interno",
			code: "INTERNAL_SERVER_ERROR",
		});
	}
}
