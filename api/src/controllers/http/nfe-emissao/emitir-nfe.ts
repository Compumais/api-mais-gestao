import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { emitirNfeVendaService } from "@/service/nfe-emissao/emitir-nfe-venda.js";
import { listarNotasFiscaisService } from "@/service/nota-fiscal/listar-notas-fiscais.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { emitirNfeBodySchema } from "./emissao-nfe-body-schema.js";

const listarNfeQuerySchema = z.object({
	idempresa: z.string().uuid(),
	status: z.coerce.number().optional(),
	page: z.coerce.number().default(1),
	limit: z.coerce.number().default(20),
});

export async function emitirNfe(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = emitirNfeBodySchema.parse(request.body);

		const resultado = await emitirNfeVendaService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			idnotafiscal: dados.idnotafiscal,
			iddestinatario: dados.iddestinatario,
			idserienfe: dados.idserienfe,
			confirmarProducao: dados.confirmarProducao,
			natOp: dados.natOp,
			indPres: dados.indPres,
			itens: dados.itens,
			totais: dados.totais,
			pagamento: dados.pagamento,
			transporte: dados.transporte,
			informacoesAdicionais: dados.informacoesAdicionais,
			documentoReferenciado: dados.documentoReferenciado,
			idplanocontas: dados.idplanocontas,
			idcondicaopagto: dados.idcondicaopagto,
			idlocalestoque: dados.idlocalestoque,
			idtipodocumento: dados.idtipodocumento,
			iddav: dados.iddav,
			iddavs: dados.iddavs,
			codigosPedidos: dados.codigosPedidos,
			formasPagamento: dados.formasPagamento,
			gerarFinanceiro: dados.gerarFinanceiro,
			gerarEstoque: dados.gerarEstoque,
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

export async function listarNfesEmitidas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, status, page, limit } = listarNfeQuerySchema.parse(
			request.query,
		);

		const resultado = await listarNotasFiscaisService({
			idusuario: request.user.id,
			idempresa,
			status,
			tipoorigem: 1,
			page,
			limit,
			rascunho: false,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
