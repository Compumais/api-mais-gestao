import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ORDENAR_TIPOS_DOCUMENTO_FINANCEIRO_CAMPOS,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { listarTipoDocumentoFinanceirosService } from "@/service/tipo-documento-financeiro/listar-tipo-documento-financeiros.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarTipoDocumentoFinanceirosQuerySchema = z.object({
	idempresa: z.string(),
	descricao: textoOpcional,
	formapagamentonfe: textoOpcional,
	prazodias: textoOpcional,
	destino: z.enum(["caixa", "recebivel", "contas_receber"]).optional(),
	inativo: z.coerce.number().int().optional(),
	ordenarPor: z.enum(ORDENAR_TIPOS_DOCUMENTO_FINANCEIRO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarTipoDocumentoFinanceiros(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarTipoDocumentoFinanceirosQuerySchema.parse(request.query);

		const resultado = await listarTipoDocumentoFinanceirosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			descricao: query.descricao,
			formapagamentonfe: query.formapagamentonfe,
			prazodias: query.prazodias,
			destino: query.destino,
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
