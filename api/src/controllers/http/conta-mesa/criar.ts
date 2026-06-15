import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarContaMesaService } from "@/service/conta-mesa/criar-conta-mesa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarContaMesaBodySchema = z.object({
	idempresa: z.string(),
	idusuario: z.string(),
	numeromesa: z.number().int(),
	idcliente: z.string().optional(),
	desconto: z.string().optional(),
	idgarcom: z.string().optional(),
	numeropessoas: z.number().int().optional(),
	observacao: z.string().optional(),
	status: z.number().int().optional(),
	telefone: z.string().max(20).optional(),
	usuarioquefechouconta: z.string().optional(),
	valorcartao: z.string().optional(),
	valorcouverartistico: z.string().optional(),
	valordinheiro: z.string().optional(),
	valorpendente: z.string().optional(),
	valorpix: z.string().optional(),
	valorprepago: z.string().optional(),
	valortaxaservico: z.string().optional(),
	valortotal: z.string().optional(),
	valortroco: z.string().optional(),
});

export async function criarContaMesa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarContaMesaBodySchema.parse(request.body);

		const resultado = await criarContaMesaService({
			dadosContaMesa: { id: uuidv4(), ...dadosValidados },
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
