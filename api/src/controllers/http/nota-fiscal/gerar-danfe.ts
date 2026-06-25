import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarDanfeNfeService } from "@/service/nfe-emissao/gerar-danfe-nfe.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const gerarDanfeParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function gerarDanfeNotaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = gerarDanfeParamsSchema.parse(request.params);

		const resultado = await gerarDanfeNfeService({
			idusuario: request.user.id,
			idnotafiscal: id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		reply.header("Content-Type", "application/pdf");
		reply.header(
			"Content-Disposition",
			`inline; filename="${resultado.body.filename}"`,
		);

		return reply.status(200).send(resultado.body.pdf);
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
