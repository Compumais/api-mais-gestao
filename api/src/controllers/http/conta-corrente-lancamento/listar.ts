import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_CONTA_CORRENTE_LANCAMENTOS_CAMPOS } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { listarContaCorrenteLancamentosService } from "@/service/contacorrentelancamento/listar-conta-corrente-lancamentos.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarContaCorrenteLancamentoQuerySchema = z.object({
	idcontacorrente: z.string(),
	historico: textoOpcional,
	documento: textoOpcional,
	planocontasnome: textoOpcional,
	datahora: textoOpcional,
	sentido: z.enum(["entrada", "saida"]).optional(),
	ordenarPor: z.enum(ORDENAR_CONTA_CORRENTE_LANCAMENTOS_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarContaCorrenteLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarContaCorrenteLancamentoQuerySchema.parse(request.query);

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: query.idcontacorrente,
			historico: query.historico,
			documento: query.documento,
			planocontasnome: query.planocontasnome,
			datahora: query.datahora,
			sentido: query.sentido,
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
		return reply.status(500).send({
			error: "Erro ao listar lançamentos de conta corrente",
			code: "LIST_CONTA_CORRENTE_LANCAMENTO_ERROR",
		});
	}
}
