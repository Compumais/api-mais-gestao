import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarEquipamentoService } from "@/service/equipamento/criar-equipamento.js";
import { exigirUsuario, responderErro } from "../locacao/responder.js";

const bodySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().max(40).optional().nullable(),
	descricao: z.string().trim().min(1).max(120),
	numeroserie: z.string().max(60).optional().nullable(),
	situacao: z.enum(["disponivel", "inativo"]).optional(),
	precodiaria: z.coerce.number(),
	precosemanal: z.coerce.number(),
	precoquinzenal: z.coerce.number(),
	precomensal: z.coerce.number(),
	observacao: z.string().optional().nullable(),
});

export async function criarEquipamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const dados = bodySchema.parse(request.body);
		const resultado = await criarEquipamentoService({
			...dados,
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
