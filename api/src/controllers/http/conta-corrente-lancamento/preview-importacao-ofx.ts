import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { previewImportacaoOfxService } from "@/service/contacorrentelancamento/preview-importacao-ofx.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
} from "@/util/http-util.js";

const previewImportacaoOfxBodySchema = z.object({
	idcontacorrente: z.string().uuid(),
	conteudoOfx: z.string().min(1),
});

export async function previewImportacaoOfx(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = previewImportacaoOfxBodySchema.parse(request.body);

		const contaCorrente = await buscarContaCorrentePorId({
			id: dadosValidados.idcontacorrente,
		});

		if (!contaCorrente?.idempresa) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		const resultado = await previewImportacaoOfxService(
			dadosValidados.idcontacorrente,
			dadosValidados.conteudoOfx,
			request.user.id,
			contaCorrente.idempresa,
		);

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
