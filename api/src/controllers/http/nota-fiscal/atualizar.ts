import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { atualizarNotaFiscalService } from "@/service/nota-fiscal/atualizar-nota-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarNotaFiscalParamsSchema = z.object({
	id: z.string(),
});

const atualizarNotaFiscalBodySchema = z.object({
	identidade: z.string().optional().nullable(),
	numero: z.string().max(60).optional().nullable(),
	serie: z.string().max(6).optional().nullable(),
	modelo: z.string().max(4).optional().nullable(),
	chavenfe: z.string().max(44).optional().nullable(),
	emissao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
	datahoraemissao: z.string().optional().nullable(),
	tipodocumento: z.string().max(2).optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	valortotalnota: z.union([z.string(), z.number()]).optional().nullable(),
	totalproduto: z.union([z.string(), z.number()]).optional().nullable(),
	frete: z.union([z.string(), z.number()]).optional().nullable(),
	seguro: z.union([z.string(), z.number()]).optional().nullable(),
	outrasdespesas: z.union([z.string(), z.number()]).optional().nullable(),
	descontoproduto: z.union([z.string(), z.number()]).optional().nullable(),
	icms: z.union([z.string(), z.number()]).optional().nullable(),
	ipi: z.union([z.string(), z.number()]).optional().nullable(),
	observacao: z.string().optional().nullable(),
	status: z.number().int().optional().nullable(),
});

function paraString(valor: string | number | null | undefined): string | null {
	if (valor === undefined || valor === null) return null;
	return typeof valor === "number" ? valor.toString() : valor;
}

export async function atualizarNotaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarNotaFiscalParamsSchema.parse(request.params);
		const dadosValidados = atualizarNotaFiscalBodySchema.parse(request.body);

		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				(entry): entry is [string, string | number | null] =>
					entry[1] !== undefined,
			),
		) as Partial<NovaNotaFiscal>;

		const camposNumericos = [
			"valortotalnota",
			"totalproduto",
			"frete",
			"seguro",
			"outrasdespesas",
			"descontoproduto",
			"icms",
			"ipi",
		] as const;

		for (const campo of camposNumericos) {
			if (dadosValidados[campo] !== undefined) {
				(dados as Record<string, string | null>)[campo] = paraString(
					dadosValidados[campo],
				);
			}
		}

		const resultado = await atualizarNotaFiscalService({
			notaFiscalId: id,
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
