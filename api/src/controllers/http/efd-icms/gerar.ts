import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarEfdIcmsService } from "@/service/efd-icms/gerar-efd-icms.service.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const gerarEfdIcmsBodySchema = z.object({
	idempresa: z.string().uuid(),
	dataInicio: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	dataFim: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	finalidade: z.enum(["0", "1"]).optional(),
	incluirInventario: z.boolean().optional(),
	dataInventario: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
		.optional(),
});

export async function gerarEfdIcms(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = gerarEfdIcmsBodySchema.parse(request.body);
		const resultado = await gerarEfdIcmsService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			dataInicio: body.dataInicio,
			dataFim: body.dataFim,
			finalidade: body.finalidade,
			incluirInventario: body.incluirInventario,
			dataInventario: body.dataInventario,
		});

		if (!resultado.success) {
			return reply
				.status(resultado.status)
				.send("error" in resultado ? resultado.error : httpErroInterno());
		}

		if (!resultado.body) {
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		const { content, contentType, filename, alertas, totalLinhas } =
			resultado.body;

		reply.header("Content-Type", contentType);
		reply.header("Content-Disposition", `attachment; filename="${filename}"`);
		reply.header("X-Efd-Alertas", encodeURIComponent(JSON.stringify(alertas)));
		reply.header("X-Efd-Total-Linhas", String(totalLinhas));

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
