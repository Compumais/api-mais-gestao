import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { preverFechamentoLocacaoService } from "@/service/locacao/prever-fechamento-locacao.js";
import { exigirUsuario, responderErro } from "./responder.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
	idempresa: z.string().min(1),
	datadevolucao: z.string().min(1),
});

export async function preverFechamentoLocacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);
		const resultado = await preverFechamentoLocacaoService({
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
