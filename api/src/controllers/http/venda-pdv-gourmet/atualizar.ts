import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovaVendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { atualizarVendaPdvGourmetService } from "@/service/venda-pdv-gourmet/atualizar-venda-pdv-gourmet.js";import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarVendaPdvGourmetParamsSchema = z.object({
	id: z.string(),
});

const valorPagamentoOptional = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.optional();

const atualizarVendaPdvGourmetBodySchema = z.object({
	idempresa: z.string().optional(),
	idcontamesa: z.string().optional(),
	vendalocal: z.number().int().optional(),
	numeropdv: z.number().int().optional(),
	idvendaitem: z.string().optional(),
	usuarioquefechouvenda: z.string().optional(),
	valordinheiro: valorPagamentoOptional,
	valorcartao: valorPagamentoOptional,
	valorpix: valorPagamentoOptional,
	valorprepago: valorPagamentoOptional,
	valortroco: valorPagamentoOptional,
	valortotal: valorPagamentoOptional,
});

export async function atualizarVendaPdvGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarVendaPdvGourmetParamsSchema.parse(request.params);
		const dadosValidados = atualizarVendaPdvGourmetBodySchema.parse(request.body);
		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				(entry): entry is [string, string | number] => entry[1] !== undefined,
			),
		) as Partial<NovaVendaPdvGourmet>;

		const resultado = await atualizarVendaPdvGourmetService({			vendaPdvGourmetId: id,
			idusuario: request.user.id,
			dados,
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
