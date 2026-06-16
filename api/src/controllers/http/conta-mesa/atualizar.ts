import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovaContaMesa } from "@/model/conta-mesa-model.js";
import { atualizarContaMesaService } from "@/service/conta-mesa/atualizar-conta-mesa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarContaMesaParamsSchema = z.object({
	id: z.string(),
});

const atualizarContaMesaBodySchema = z.object({
	idcliente: z.string().optional(),
	desconto: z.string().optional(),
	idgarcom: z.string().optional(),
	numeromesa: z.number().int().optional(),
	numeropessoas: z.number().int().optional(),
	observacao: z.string().optional(),
	status: z.number().int().optional(),
	telefone: z.string().max(20).optional(),
	usuarioquefechouconta: z.string().optional(),
	valorcartao: z.string().optional(),
	valorcartaocredito: z.string().optional(),
	valorcartaodebito: z.string().optional(),
	valorcouverartistico: z.string().optional(),
	valordinheiro: z.string().optional(),
	valorpendente: z.string().optional(),
	valorpix: z.string().optional(),
	valorprepago: z.string().optional(),
	valortaxaservico: z.string().optional(),
	valortotal: z.string().optional(),
	valortroco: z.string().optional(),
});

export async function atualizarContaMesa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarContaMesaParamsSchema.parse(request.params);
		const dadosValidados = atualizarContaMesaBodySchema.parse(request.body);
		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				(entry): entry is [string, string | number] => entry[1] !== undefined,
			),
		) as Partial<NovaContaMesa>;

		const resultado = await atualizarContaMesaService({
			contaMesaId: id,
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
