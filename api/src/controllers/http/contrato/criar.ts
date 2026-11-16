import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarContratoService } from "@/service/contrato/criar-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().min(1),
	identidade: z.string().min(1),
	idtipocontrato: z.string().optional().nullable(),
	codigo: z.string().max(40).optional().nullable(),
	descricao: z.string().trim().min(1).max(255),
	situacao: z.enum(["ativo", "suspenso", "encerrado"]).optional(),
	datainicio: z.string().min(1),
	datafim: z.string().optional().nullable(),
	valor: z.union([z.string(), z.number()]),
	periodicidade: z.enum(["mensal"]).optional(),
	diavencimento: z.coerce.number().int().min(1).max(28),
	regracompetencia: z.enum(["mes_atual", "mes_seguinte"]).optional(),
	fluxofaturamento: z.coerce.number().int().min(1).max(3),
	discriminacao: z.string().optional().nullable(),
	itemlistaservico: z.string().max(20).optional().nullable(),
	codigonbs: z.string().max(9).optional().nullable(),
	codigotributacaonacional: z.string().max(6).optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().min(1),
	idplanocontas: z.string().optional().nullable(),
	idcontacorrente: z.string().optional().nullable(),
	idtipocobranca: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
});

export async function criarContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = bodySchema.parse(request.body);
		const resultado = await criarContratoService({
			dados: {
				id: uuidv4(),
				...dados,
				valor: String(dados.valor),
				situacao: dados.situacao ?? "ativo",
				periodicidade: dados.periodicidade ?? "mensal",
				regracompetencia: dados.regracompetencia ?? "mes_atual",
				idtipocontrato: dados.idtipocontrato ?? null,
				codigo: dados.codigo ?? null,
				datafim: dados.datafim ?? null,
				discriminacao: dados.discriminacao ?? null,
				itemlistaservico: dados.itemlistaservico ?? null,
				codigonbs: dados.codigonbs ?? null,
				codigotributacaonacional: dados.codigotributacaonacional ?? null,
				idcondicaopagto: dados.idcondicaopagto ?? null,
				idplanocontas: dados.idplanocontas ?? null,
				idcontacorrente: dados.idcontacorrente ?? null,
				idtipocobranca: dados.idtipocobranca ?? null,
				observacao: dados.observacao ?? null,
			},
			idusuario: request.user.id,
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
