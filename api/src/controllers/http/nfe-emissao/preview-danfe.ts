import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { previewDanfeNfeVendaService } from "@/service/nfe-emissao/preview-danfe-nfe-venda.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { emitirNfeBodySchema } from "./emissao-nfe-body-schema.js";

export async function previewDanfeNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = emitirNfeBodySchema.parse(request.body);

		const resultado = await previewDanfeNfeVendaService({
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
			formasPagamento: dados.formasPagamento,
			gerarFinanceiro: dados.gerarFinanceiro,
			gerarEstoque: dados.gerarEstoque,
		});

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.status).send(resultado);
		}

		const { filename, pdf } = resultado.body;

		reply.header("Content-Type", "application/pdf");
		reply.header("Content-Disposition", `inline; filename="${filename}"`);

		return reply.status(200).send(pdf);
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
