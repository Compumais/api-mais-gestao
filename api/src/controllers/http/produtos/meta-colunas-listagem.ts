import type { FastifyReply, FastifyRequest } from "fastify";
import { listarMetaColunasProdutos } from "@/util/produtos-meta-colunas.js";
import { httpOk, httpNaoAutorizado } from "@/util/http-util.js";

export async function metaColunasListagemProdutos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
	}

	const colunas = listarMetaColunasProdutos();
	return reply.status(httpOk({ colunas }).status).send({ colunas });
}
