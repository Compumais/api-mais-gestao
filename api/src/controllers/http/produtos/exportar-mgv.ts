import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { exportarProdutosMgvService } from "@/service/produto/exportar-produtos-mgv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const exportarMgvBodySchema = z.object({
	idempresa: z.string().uuid(),
	departamentoPadrao: z.coerce.number().int().min(1).max(99).optional(),
	diasValidade: z.coerce
		.number()
		.int()
		.refine(
			(valor) => (valor >= 0 && valor <= 990) || valor === 998 || valor === 999,
			{
				message: "Dias de validade deve ser 0 a 990, 998 ou 999",
			},
		)
		.optional(),
	apenasPesaveis: z.boolean().optional(),
});

export async function exportarProdutosMgv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = exportarMgvBodySchema.parse(request.body);

		const resultado = await exportarProdutosMgvService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			departamentoPadrao: body.departamentoPadrao,
			diasValidade: body.diasValidade,
			apenasPesaveis: body.apenasPesaveis,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!resultado.body) {
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		const { content, contentType, filename, alertas, totalLinhas } =
			resultado.body;

		reply.header("Content-Type", contentType);
		reply.header("Content-Disposition", `attachment; filename="${filename}"`);
		reply.header("X-Mgv-Alertas", encodeURIComponent(JSON.stringify(alertas)));
		reply.header("X-Mgv-Total-Linhas", String(totalLinhas));

		return reply.status(200).send(content);
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
