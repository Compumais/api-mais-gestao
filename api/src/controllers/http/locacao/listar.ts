import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarLocacoesService } from "@/service/locacao/listar-locacoes.js";
import { exigirUsuario, responderErro } from "./responder.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().optional(),
	situacao: z.enum(["aberta", "fechada", "cancelada"]).optional(),
	identidade: z.string().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listarLocacoes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const filtros = querySchema.parse(request.query);
		const resultado = await listarLocacoesService({
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
