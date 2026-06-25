import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarParametrizacaoTributosService } from "@/service/parametrizacao-tributos/criar-parametrizacao-tributos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const campoNumericoOpcional = z
	.string()
	.optional()
	.nullable()
	.transform((valor) => {
		const texto = valor?.trim();
		return texto ? texto : null;
	});

const campoTextoOpcional = (tamanho: number) =>
	z
		.string()
		.max(tamanho)
		.optional()
		.nullable()
		.transform((valor) => {
			const texto = valor?.trim();
			return texto ? texto : null;
		});

export const parametrizacaoTributosBodySchema = z.object({
	idempresa: z.string().uuid(),
	codigocfopentrada: z.string().min(1).max(10),
	cstentrada: campoTextoOpcional(3),
	csosnentrada: campoTextoOpcional(3),
	ncm: campoTextoOpcional(10),
	taxaicmsentrada: campoNumericoOpcional,
	uf: campoTextoOpcional(2).transform((valor) =>
		valor ? valor.toUpperCase() : null,
	),
	ignorarprimeirodigitocst: z
		.union([z.boolean(), z.number()])
		.optional()
		.nullable()
		.transform((valor) => (valor ? 1 : 0)),
	idcfopsaidanfe: z.string().uuid().optional().nullable(),
	cstnfe: campoTextoOpcional(3),
	csosnnfe: campoTextoOpcional(3),
	taxaicmsnfe: campoNumericoOpcional,
	idcfopsaidanfce: z.string().uuid().optional().nullable(),
	cstnfce: campoTextoOpcional(7),
	csosnnfce: campoTextoOpcional(3),
	taxaicmsnfce: campoNumericoOpcional,
	aliquotapis: campoNumericoOpcional,
	cstpis: campoTextoOpcional(2),
	aliquotacofins: campoNumericoOpcional,
	cstcofins: campoTextoOpcional(2),
	cstipi: campoTextoOpcional(2),
	idenquadramentoipi: z.string().uuid().optional().nullable(),
	percentualmva: campoNumericoOpcional,
	percentualirrf: campoNumericoOpcional,
});

export async function criarParametrizacaoTributos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = parametrizacaoTributosBodySchema.parse(request.body);

		const resultado = await criarParametrizacaoTributosService({
			dados: {
				id: uuidv4(),
				...dadosValidados,
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
