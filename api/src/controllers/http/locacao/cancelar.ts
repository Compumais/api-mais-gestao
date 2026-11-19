import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cancelarLocacaoService } from "@/service/locacao/cancelar-locacao.js";
import { exigirUsuario, responderErro } from "./responder.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
	idempresa: z.string().min(1),
});

export async function cancelarLocacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);
		const resultado = await cancelarLocacaoService({
			...dados,
			id,
			idusuario: usuario.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErro(error, reply);
	}
}
