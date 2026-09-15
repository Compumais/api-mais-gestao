import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { fecharFatiaItensContaMesaService } from "@/service/conta-mesa/fechar-fatia-itens-conta-mesa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const valorPagamentoOptional = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.optional();

const fecharFatiaItensParamsSchema = z.object({
	id: z.string(),
});

const fecharFatiaItensBodySchema = z.object({
	idempresa: z.string(),
	numeropdv: z.number().int(),
	idsItens: z.array(z.string()).min(1),
	valordinheiro: valorPagamentoOptional,
	valorcartao: valorPagamentoOptional,
	valorcartaocredito: valorPagamentoOptional,
	valorcartaodebito: valorPagamentoOptional,
	valorpix: valorPagamentoOptional,
	valorprepago: valorPagamentoOptional,
	desconto: valorPagamentoOptional,
	valortaxaservico: valorPagamentoOptional,
	valorcouverartistico: valorPagamentoOptional,
	valortroco: valorPagamentoOptional,
	identidade: z.string().uuid().optional(),
	idcondicaopagto: z.string().uuid().optional(),
	pagamentosErp: z
		.array(
			z.object({
				idtipodocumentofinanceiro: z.string().uuid(),
				valor: z.union([z.string(), z.number()]),
			}),
		)
		.optional(),
	pagamentos: z
		.array(
			z.object({
				meio: z.enum(["DINHEIRO", "PIX", "CARTAO"]),
				valor: z.union([z.string(), z.number()]),
				nsu: z.string().nullable().optional(),
				autorizacao: z.string().nullable().optional(),
				bandeira: z.string().nullable().optional(),
				status: z.enum(["ok", "pendente", "cancelado"]).optional(),
			}),
		)
		.optional(),
});

export async function fecharFatiaItensContaMesa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = fecharFatiaItensParamsSchema.parse(request.params);
		const dadosValidados = fecharFatiaItensBodySchema.parse(request.body);

		const {
			idempresa,
			numeropdv,
			idsItens,
			pagamentosErp,
			pagamentos,
			...pagamento
		} = dadosValidados;

		const pagamentosErpNormalizados = pagamentosErp?.map((forma) => ({
			idtipodocumentofinanceiro: forma.idtipodocumentofinanceiro,
			valor:
				typeof forma.valor === "number"
					? forma.valor
					: Number.parseFloat(String(forma.valor).replace(",", ".")) || 0,
		}));

		const pagamentosNormalizados = pagamentos?.map((item) => ({
			meio: item.meio,
			valor:
				typeof item.valor === "number"
					? item.valor
					: Number.parseFloat(String(item.valor).replace(",", ".")) || 0,
			nsu: item.nsu ?? null,
			autorizacao: item.autorizacao ?? null,
			bandeira: item.bandeira ?? null,
			status: item.status ?? "ok",
		}));

		const resultado = await fecharFatiaItensContaMesaService({
			contaMesaId: id,
			idusuario: request.user.id,
			idempresa,
			numeropdv,
			idsItens,
			pagamento: {
				...pagamento,
				pagamentosErp: pagamentosErpNormalizados,
			},
			pagamentos: pagamentosNormalizados,
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
