import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarFinanceiroService } from "@/service/financeiro/atualizar-financeiro";

const atualizarFinanceiroParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarFinanceiroBodySchema = z.object({
	identidade: z.string().uuid().optional().nullable(),
	tipo: z.string().length(1).optional().nullable(),
	tipoorigem: z.number().optional().nullable(),
	idorigem: z.number().optional().nullable(),
	parcela: z.number().optional().nullable(),
	documento: z.string().max(60).optional().nullable(),
	idtipodocumentofinanceiro: z.number().optional().nullable(),
	status: z.string().length(1).optional().nullable(),
	emissao: z.string().optional().nullable(),
	vencimento: z.string().optional().nullable(),
	vencimentooriginal: z.string().optional().nullable(),
	pagamento: z.string().optional().nullable(),
	baixa: z.string().optional().nullable(),
	valor: z.string().optional(),
	saldo: z.string().optional(),
	historico: z.string().optional().nullable(),
	idbanco: z.number().optional().nullable(),
	agencia: z.string().max(15).optional().nullable(),
	numerocontacorrente: z.string().max(40).optional().nullable(),
	cnpjcpfemitente: z.string().max(30).optional().nullable(),
	emitente: z.string().max(60).optional().nullable(),
	identidadedestino: z.number().optional().nullable(),
	idcodigocontabil: z.number().optional().nullable(),
	juros: z.number().optional(),
	multa: z.number().optional(),
	taxafinanciamento: z.number().optional(),
	evento: z.number().optional().nullable(),
	devolucaocodigo: z.number().optional().nullable(),
	devolucaodescricao: z.string().max(50).optional().nullable(),
	devolucaodata: z.string().optional().nullable(),
	protestodate: z.string().optional().nullable(),
	nossonumero: z.string().max(25).optional().nullable(),
	idcontageraboleto: z.number().optional().nullable(),
	numerocheque: z.string().max(10).optional().nullable(),
	remessagerada: z.number().optional().nullable(),
	boletoimpresso: z.number().optional().nullable(),
	currenttimemillis: z.number().optional().nullable(),
});

export async function atualizarFinanceiro(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { id } = atualizarFinanceiroParamsSchema.parse(request.params);
		const dados = atualizarFinanceiroBodySchema.parse(request.body);

		const resultado = await atualizarFinanceiroService({ id, dados });

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
			error: "Erro ao atualizar financeiro",
			code: "UPDATE_FINANCEIRO_ERROR",
		});
	}
}
