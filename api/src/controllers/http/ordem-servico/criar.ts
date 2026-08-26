import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarOrdemServicoService } from "@/service/ordem-servico/criar-ordem-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { ORDEM_SERVICO_CAMPOS_EXTRA } from "@/util/ordem-servico-constants.js";

const extrasSchema = Object.fromEntries(
	ORDEM_SERVICO_CAMPOS_EXTRA.map((campo) => [
		campo,
		z.string().nullable().optional(),
	]),
);

const criarOrdemServicoBodySchema = z.object({
	idempresa: z.string().uuid(),
	idcliente: z.string().uuid().optional().nullable(),
	nomecliente: z.string().max(60).optional().nullable(),
	cnpjcpfcliente: z.string().max(18).optional().nullable(),
	idobjeto: z.string().uuid().optional().nullable(),
	idarea: z.string().uuid().optional().nullable(),
	idprioridade: z.string().uuid().optional().nullable(),
	idtipoproblema: z.string().uuid().optional().nullable(),
	idatendente: z.string().min(1).optional().nullable(),
	idultimotecnico: z.string().min(1).optional().nullable(),
	idcondicaopagamento: z.string().uuid().optional().nullable(),
	idtipodocumentofinanceiro: z.string().uuid().optional().nullable(),
	problemadescrito: z.string().optional().nullable(),
	laudotecnico: z.string().optional().nullable(),
	servicoexecutado: z.string().optional().nullable(),
	serviconaoexecutado: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
	agendamento: z.string().optional().nullable(),
	previsaoconclusao: z.string().optional().nullable(),
	dataos: z.string().optional().nullable(),
	orcamento: z.number().int().optional(),
	marca: z.string().max(30).optional().nullable(),
	modelo: z.string().max(30).optional().nullable(),
	placa: z.string().max(10).optional().nullable(),
	renavam: z.string().max(11).optional().nullable(),
	...extrasSchema,
});

function isPostgresForeignKeyError(error: unknown): boolean {
	return (
		!!error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "23503"
	);
}

export async function criarOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarOrdemServicoBodySchema.parse(request.body);
		const resultado = await criarOrdemServicoService({
			dadosOrdemServico: dadosValidados,
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
		if (isPostgresForeignKeyError(error)) {
			return reply.status(400).send({
				error: "Referência inválida ao criar ordem de serviço",
				code: "FOREIGN_KEY_VIOLATION",
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
