import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { fecharLocacaoService } from "@/service/locacao/fechar-locacao.js";
import { exigirUsuario, responderErro } from "./responder.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
	idempresa: z.string().min(1),
	datadevolucao: z.string().min(1),
	formapagamento: z.enum(["prazo", "avista"]),
	idplanocontas: z.string().min(1),
	idtipodocumento: z.string().optional().nullable(),
	vencimento: z.string().optional().nullable(),
	idcontacorrente: z.string().optional().nullable(),
});

export async function fecharLocacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);
		const resultado = await fecharLocacaoService({
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
