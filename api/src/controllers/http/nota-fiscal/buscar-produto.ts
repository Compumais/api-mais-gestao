import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	buscarProdutoPorCodigoOuEan,
	buscarProdutoPorDescricao,
} from "@/repositories/produtos-repositories.js";
import { httpErroInterno } from "@/util/http-util.js";

const buscarProdutoQuerySchema = z.object({
	idempresa: z.string(),
	q: z.string().optional(),
	codigo: z
		.string()
		.optional()
		.transform((v) => (v ? parseInt(v, 10) : undefined)),
	ean: z
		.string()
		.optional()
		.transform((v) => {
			if (!v) return undefined;
			const digitos = v.replace(/\D/g, "");
			return digitos ? digitos : undefined;
		}),
});

export async function buscarProdutoParaNF(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const query = buscarProdutoQuerySchema.parse(request.query);

		if (!query.q && query.codigo === undefined && query.ean === undefined) {
			return reply.status(400).send({
				error: "Informe ao menos um parâmetro de busca: q, codigo ou ean",
				code: "PARAMETRO_OBRIGATORIO",
			});
		}

		if (query.codigo !== undefined || query.ean !== undefined) {
			const produto = await buscarProdutoPorCodigoOuEan(
				query.idempresa,
				query.codigo,
				query.ean,
			);

			if (produto) {
				return reply.status(200).send({ produto, encontrado: true });
			}
		}

		if (query.q) {
			const produto = await buscarProdutoPorDescricao(query.idempresa, query.q);

			if (produto) {
				return reply.status(200).send({ produto, encontrado: true });
			}
		}

		return reply.status(200).send({ produto: null, encontrado: false });
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply
			.status(httpErroInterno().status)
			.send(httpErroInterno());
	}
}
