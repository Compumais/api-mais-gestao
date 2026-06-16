import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarVendaPdvGourmetService } from "@/service/venda-pdv-gourmet/criar-venda-pdv-gourmet.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const valorPagamentoOptional = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.optional();

const criarVendaPdvGourmetBodySchema = z.object({
	idempresa: z.string(),
	numeropdv: z.number().int(),
	usuarioquefechouvenda: z.string(),
	idcontamesa: z.string().optional(),
	vendalocal: z.number().int().optional(),
	idvendaitem: z.string().optional(),
	valordinheiro: valorPagamentoOptional,
	valorcartao: valorPagamentoOptional,
	valorcartaocredito: valorPagamentoOptional,
	valorcartaodebito: valorPagamentoOptional,
	valorpix: valorPagamentoOptional,
	valorprepago: valorPagamentoOptional,
	valortroco: valorPagamentoOptional,
	valortotal: valorPagamentoOptional,
});

export async function criarVendaPdvGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarVendaPdvGourmetBodySchema.parse(request.body);

		const resultado = await criarVendaPdvGourmetService({
			dadosVendaPdvGourmet: { id: uuidv4(), ...dadosValidados },
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
