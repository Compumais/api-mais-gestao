import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarEquipamentosService } from "@/service/equipamento/listar-equipamentos.js";
import { exigirUsuario, responderErro } from "../locacao/responder.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	descricao: z.string().optional(),
	codigo: z.string().optional(),
	situacao: z.enum(["disponivel", "alocado", "inativo"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listarEquipamentos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const filtros = querySchema.parse(request.query);
		const resultado = await listarEquipamentosService({
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
