import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarTiposDocumentoFinanceiroPadraoService } from "@/service/tipo-documento-financeiro/criar-tipos-documento-financeiro-padrao.js";
import { listarTipoDocumentoFinanceirosService } from "@/service/tipo-documento-financeiro/listar-tipo-documento-financeiros.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido } from "@/util/http-util.js";

const popularPadraoBodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function popularTiposDocumentoFinanceiroPadrao(
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

		const criados = await criarTiposDocumentoFinanceiroPadraoService(idempresa);

		const listagem = await listarTipoDocumentoFinanceirosService({
			idusuario: request.user.id,
			idempresa,
			page: 1,
			limit: 100,
			inativo: 0,
		});

		if (!listagem.success) {
			return reply.status(listagem.status).send(listagem);
		}

		return reply.status(httpOk().status).send({
			criados: criados.length,
			data: listagem.body?.data ?? [],
			paginacao: listagem.body?.paginacao,
		});
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
