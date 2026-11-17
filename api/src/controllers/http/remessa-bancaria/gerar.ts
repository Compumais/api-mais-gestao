import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarRemessaLoteService } from "@/service/remessa-bancaria/gerar-remessa-lote.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idcontacorrente: z.string().uuid(),
	idsfinanceiros: z.array(z.string().uuid()).min(1),
	dadosCobranca: z
		.object({
			instrucaocobrancaboleto: z.number().int().optional().nullable(),
			diasinstrucaocobrancaboleto: z.number().int().optional().nullable(),
			observacaoboleto: z.string().max(500).optional().nullable(),
			percentualdesconto: z.number().optional().nullable(),
		})
		.optional(),
});

export async function gerarRemessaBancaria(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await gerarRemessaLoteService({
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idcontacorrente: body.idcontacorrente,
			idsfinanceiros: body.idsfinanceiros,
			dadosCobranca: body.dadosCobranca,
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
			error: "Erro ao gerar remessa bancária",
			code: "GERAR_REMESSA_ERROR",
		});
	}
}
