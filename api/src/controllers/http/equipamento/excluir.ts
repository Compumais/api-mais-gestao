import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirEquipamentoService } from "@/service/equipamento/excluir-equipamento.js";
import { exigirUsuario, responderErro } from "../locacao/responder.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ idempresa: z.string().min(1) });

export async function excluirEquipamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = querySchema.parse(request.query);
		const resultado = await excluirEquipamentoService({
			id,
			idempresa,
			idusuario: usuario.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send();
	} catch (error) {
		return responderErro(error, reply);
	}
}
