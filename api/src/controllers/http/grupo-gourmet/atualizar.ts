import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarGrupoGourmetService } from "@/service/grupo-gourmet/atualizar-grupo-gourmet.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarGrupoGourmetParamsSchema = z.object({
	id: z.string(),
});

const atualizarGrupoGourmetBodySchema = z.object({
	nome: z.string().min(1).max(60).optional(),
	codigo: z.string().max(30).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional(),
});

export async function atualizarGrupoGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarGrupoGourmetParamsSchema.parse(request.params);
		const dados = atualizarGrupoGourmetBodySchema.parse(request.body);

		const resultado = await atualizarGrupoGourmetService({
			id,
			idusuario: request.user.id,
			dados: {
				...(dados.nome !== undefined ? { nome: dados.nome.trim() } : {}),
				...(dados.codigo !== undefined
					? { codigo: dados.codigo?.trim() || null }
					: {}),
				...(dados.inativo !== undefined ? { inativo: dados.inativo } : {}),
			},
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
