import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_UNIDADE_MEDIDA_CAMPOS } from "@/repositories/unidade-medida-repositories.js";
import { listarUnidadeMedidasService } from "@/service/unidade-medida/listar-unidade-medidas.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarUnidadeMedidasQuerySchema = z.object({
	idempresa: z.string(),
	nome: textoOpcional,
	q: textoOpcional,
	codigo: textoOpcional,
	origem: z.enum(["sistema", "empresa"]).optional(),
	casasdecimais: textoOpcional,
	tipovalor: textoOpcional,
	ordenarPor: z.enum(ORDENAR_UNIDADE_MEDIDA_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarUnidadeMedidas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarUnidadeMedidasQuerySchema.parse(request.query);

		const resultado = await listarUnidadeMedidasService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			nome: query.nome,
			q: query.q,
			codigo: query.codigo,
			origem: query.origem,
			casasdecimais: query.casasdecimais,
			tipovalor: query.tipovalor,
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
