import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarProdutosParaVinculoNf } from "@/repositories/produtos-repositories.js";
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

		let produtos: Awaited<ReturnType<typeof buscarProdutosParaVinculoNf>> = [];

		if (query.codigo !== undefined || query.ean !== undefined) {
			produtos = await buscarProdutosParaVinculoNf({
				idempresa: query.idempresa,
				codigo: query.codigo,
				ean: query.ean,
			});
		}

		if (produtos.length === 0 && query.q) {
			produtos = await buscarProdutosParaVinculoNf({
				idempresa: query.idempresa,
				q: query.q,
			});
		}

		return reply.status(200).send({
			encontrado: produtos.length > 0,
			produtos,
		});
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
