import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_BANDEIRAS_CARTAO_CAMPOS } from "@/repositories/bandeira-cartao-repositories.js";
import { listarBandeirasCartaoService } from "@/service/bandeira-cartao/listar-bandeiras-cartao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarBandeirasCartaoQuerySchema = z.object({
	idempresa: z.string().uuid(),
	descricao: textoOpcional,
	codigo: textoOpcional,
	inativo: z.coerce.number().int().optional(),
	ordenarPor: z.enum(ORDENAR_BANDEIRAS_CARTAO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarBandeirasCartao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarBandeirasCartaoQuerySchema.parse(request.query);

		const resultado = await listarBandeirasCartaoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			descricao: query.descricao,
			codigo: query.codigo,
			inativo: query.inativo,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
			page: query.page,
			limit: query.limit,
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
