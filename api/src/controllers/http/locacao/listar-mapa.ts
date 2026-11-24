import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarMapaLocacoesService } from "@/service/locacao/listar-mapa-locacoes.js";
import { exigirUsuario, responderErro } from "./responder.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
});

export async function listarMapaLocacoes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const filtros = querySchema.parse(request.query);
		const resultado = await listarMapaLocacoesService({
			...filtros,
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
