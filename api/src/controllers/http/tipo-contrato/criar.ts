import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarTipoContratoService } from "@/service/tipo-contrato/criar-tipo-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarTipoContratoBodySchema = z.object({
	idempresa: z.string().min(1),
	idgrupocontrato: z.string().optional().nullable(),
	codigo: z.coerce.number().int().positive(),
	descricao: z.string().trim().min(1).max(120),
	valor: z.union([z.string(), z.number()]),
});

export async function criarTipoContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarTipoContratoBodySchema.parse(request.body);

		const resultado = await criarTipoContratoService({
			dadosTipoContrato: {
				id: uuidv4(),
				idempresa: dadosValidados.idempresa,
				idgrupocontrato: dadosValidados.idgrupocontrato ?? null,
				codigo: dadosValidados.codigo,
				descricao: dadosValidados.descricao,
				valor: String(dadosValidados.valor),
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
