import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCardapioDeliveryService } from "@/service/cardapio-delivery/atualizar-cardapio-delivery.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({ idempresa: z.string().min(1) });

const campoSchema = z.object({
	id: z.string().min(1),
	tipo: z.enum([
		"modalidade",
		"endereco",
		"pagamento",
		"documento",
		"observacao",
		"texto",
		"select",
	]),
	rotulo: z.string().min(1).max(80),
	obrigatorio: z.number().int().min(0).max(1),
	ordem: z.number().int().min(0),
	opcoes: z.array(z.string()).optional(),
	condicao: z
		.object({
			campoid: z.string(),
			valor: z.string(),
		})
		.nullable()
		.optional(),
});

const bodySchema = z.object({
	slug: z.string().min(2).max(80).optional(),
	ativo: z.number().int().min(0).max(1).optional(),
	corprimaria: z.string().max(16).nullable().optional(),
	habilitadelivery: z.number().int().min(0).max(1).optional(),
	habilitaretirada: z.number().int().min(0).max(1).optional(),
	taxaentregapadrao: z.union([z.string(), z.number()]).optional(),
	bairrosentrega: z
		.array(
			z.object({
				nome: z.string().min(1).max(80),
				taxa: z.number().min(0),
			}),
		)
		.optional(),
	pedidominimo: z.union([z.string(), z.number()]).optional(),
	chavepix: z.string().max(120).nullable().optional(),
	tempomedioentrega: z.string().max(60).nullable().optional(),
	mensagemrodape: z.string().max(500).nullable().optional(),
	horario: z
		.object({
			ativo: z.number().int().min(0).max(1),
			modo: z.enum(["simples", "semanal"]),
			timezone: z.string(),
			inicio: z.string().nullable(),
			fim: z.string().nullable(),
			semanal: z.record(
				z.string(),
				z.object({
					ativo: z.boolean(),
					inicio: z.string(),
					fim: z.string(),
				}),
			),
			datasfechadas: z.array(z.string()),
			mensagem: z.string().nullable(),
		})
		.optional(),
	camposfinalizacao: z.array(campoSchema).optional(),
	idmeiospagamento: z.array(z.string()).optional(),
});

export async function atualizarCardapioDelivery(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = querySchema.parse(request.query);
		const dados = bodySchema.parse(request.body);
		const resultado = await atualizarCardapioDeliveryService({
			idempresa,
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
