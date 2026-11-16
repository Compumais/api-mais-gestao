import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarContratoService } from "@/service/contrato/atualizar-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
	idempresa: z.string().min(1),
	identidade: z.string().optional(),
	idtipocontrato: z.string().optional().nullable(),
	codigo: z.string().max(40).optional().nullable(),
	descricao: z.string().trim().min(1).max(255).optional(),
	situacao: z.enum(["ativo", "suspenso", "encerrado"]).optional(),
	datainicio: z.string().optional(),
	datafim: z.string().optional().nullable(),
	valor: z.union([z.string(), z.number()]).optional(),
	periodicidade: z.enum(["mensal"]).optional(),
	diavencimento: z.coerce.number().int().min(1).max(28).optional(),
	regracompetencia: z.enum(["mes_atual", "mes_seguinte"]).optional(),
	fluxofaturamento: z.coerce.number().int().min(1).max(3).optional(),
	discriminacao: z.string().optional().nullable(),
	itemlistaservico: z.string().max(20).optional().nullable(),
	codigonbs: z.string().max(9).optional().nullable(),
	codigotributacaonacional: z.string().max(6).optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().optional(),
	idplanocontas: z.string().optional().nullable(),
	idcontacorrente: z.string().optional().nullable(),
	idtipocobranca: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
});

export async function atualizarContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);
		const { idempresa, ...dados } = body;

		const resultado = await atualizarContratoService({
			id,
			idempresa,
			idusuario: request.user.id,
			dados: {
				...dados,
				valor: dados.valor != null ? String(dados.valor) : undefined,
			},
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
