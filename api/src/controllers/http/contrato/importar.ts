import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { importarContratosService } from "@/service/contrato/importar-contratos.js";

const importarContratosSchema = z.object({
	idempresa: z.uuid(),
	formato: z.enum(["csv", "xlsx"]),
	conteudo: z.string().min(1, "O conteúdo do arquivo é obrigatório"),
	nomeArquivo: z.string().optional(),
	idtipodocumento: z.uuid(),
});

export async function importarContratos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const dadosValidados = importarContratosSchema.parse(request.body);

		const resultado = await importarContratosService({
			idempresa: dadosValidados.idempresa,
			idusuario: request.user.id,
			formato: dadosValidados.formato,
			conteudo: dadosValidados.conteudo,
			nomeArquivo: dadosValidados.nomeArquivo,
			idtipodocumento: dadosValidados.idtipodocumento,
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

		return reply.status(500).send({
			error: "Erro ao importar contratos",
			code: "IMPORT_CONTRATOS_ERROR",
		});
	}
}
