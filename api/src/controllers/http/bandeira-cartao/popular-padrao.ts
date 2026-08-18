import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarBandeirasCartaoPadraoService } from "@/service/bandeira-cartao/criar-bandeiras-cartao-padrao.js";
import { listarBandeirasCartaoService } from "@/service/bandeira-cartao/listar-bandeiras-cartao.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const popularPadraoBodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function popularBandeirasCartaoPadrao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = popularPadraoBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const criados = await criarBandeirasCartaoPadraoService(idempresa);

		const listagem = await listarBandeirasCartaoService({
			idusuario: request.user.id,
			idempresa,
			page: 1,
			limit: 100,
			inativo: 0,
		});

		if (!listagem.success) {
			return reply.status(listagem.status).send(listagem);
		}

		const payload = {
			criados: criados.length,
			data: listagem.body?.data ?? [],
			paginacao: listagem.body?.paginacao,
		};

		return reply.status(httpOk(payload).status).send(payload);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
