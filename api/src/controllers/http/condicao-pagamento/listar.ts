import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_CONDICOES_PAGAMENTO_CAMPOS } from "@/repositories/condicao-pagamento-repositories.js";
import { listarCondicaoPagamentosService } from "@/service/condicao-pagamento/listar-condicao-pagamentos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

const listarCondicaoPagamentosQuerySchema = z.object({
	idempresa: z.string(),
	codigo: textoOpcional,
	descricao: textoOpcional,
	parcelas: textoOpcional,
	prazos: textoOpcional,
	escopo: z.coerce.number().int().min(0).max(2).optional(),
	inativo: z.coerce.number().int().optional(),
	ordenarPor: z.enum(ORDENAR_CONDICOES_PAGAMENTO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarCondicaoPagamentos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarCondicaoPagamentosQuerySchema.parse(request.query);

		const resultado = await listarCondicaoPagamentosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			codigo: query.codigo,
			descricao: query.descricao,
			parcelas: query.parcelas,
			prazos: query.prazos,
			escopo: query.escopo,
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
