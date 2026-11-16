import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirGrupoContratoService } from "@/service/grupo-contrato/excluir-grupo-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function excluirGrupoContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		const resultado = await excluirGrupoContratoService({
			grupoContratoId: id,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
