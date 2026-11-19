import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEquipamentoService } from "@/service/equipamento/atualizar-equipamento.js";
import { exigirUsuario, responderErro } from "../locacao/responder.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().trim().min(1).max(40),
	descricao: z.string().trim().min(1).max(120),
	numeroserie: z.string().max(60).optional().nullable(),
	situacao: z.enum(["disponivel", "inativo", "alocado"]).optional(),
	precodiaria: z.coerce.number(),
	precosemanal: z.coerce.number(),
	precoquinzenal: z.coerce.number(),
	precomensal: z.coerce.number(),
	observacao: z.string().optional().nullable(),
});

export async function atualizarEquipamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);
		const resultado = await atualizarEquipamentoService({
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
