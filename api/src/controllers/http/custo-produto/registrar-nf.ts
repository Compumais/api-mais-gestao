import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { registrarCustosNfService } from "@/service/custo-produto/registrar-custos-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const numericString = z.string();

const itemCustoNfSchema = z.object({
	idproduto: z.string(),
	precocompra: numericString,
	custo: numericString.optional(),
	desconto: numericString.optional(),
	fretesegurooutrasdesp: numericString.optional(),
	ipi: numericString.optional(),
	icmsst: numericString.optional(),
	fcpst: numericString.optional(),
	piscofins: numericString.optional(),
	icmsfcp: numericString.optional(),
	icmsdesonerado: numericString.optional(),
	diferencialicms: numericString.optional(),
	freteconhecimento: numericString.optional(),
	icmspiscofinsconhecimento: numericString.optional(),
	vendor: numericString.optional(),
	adicional: numericString.optional(),
});

const registrarCustosNfBodySchema = z.object({
	idempresa: z.string(),
	idnotafiscal: z.string().optional(),
	idfilial: z.string().optional(),
	itens: z.array(itemCustoNfSchema).min(1),
});

export async function registrarCustosNf(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = registrarCustosNfBodySchema.parse(request.body);

		const resultado = await registrarCustosNfService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idnotafiscal: body.idnotafiscal,
			idfilial: body.idfilial,
			itens: body.itens,
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
