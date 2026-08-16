import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarGrupoGourmetService } from "@/service/grupo-gourmet/criar-grupo-gourmet.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarGrupoGourmetBodySchema = z.object({
	idempresa: z.string(),
	nome: z.string().min(1).max(60),
	codigo: z.string().max(30).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional(),
});

export async function criarGrupoGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarGrupoGourmetBodySchema.parse(request.body);

		const resultado = await criarGrupoGourmetService({
			dados: {
				id: uuidv4(),
				idempresa: dados.idempresa,
				nome: dados.nome.trim(),
				codigo: dados.codigo?.trim() || null,
				inativo: dados.inativo ?? 0,
			},
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
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
