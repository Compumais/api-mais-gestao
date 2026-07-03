import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { previewImportacaoPlanoContasService } from "@/service/planocontas/preview-importacao-plano-contas.js";

const previewImportacaoPlanoContasSchema = z.object({
	idempresa: z.uuid(),
	formato: z.enum(["csv", "xlsx"]),
	conteudo: z.string().min(1, "O conteúdo do arquivo é obrigatório"),
	nomeArquivo: z.string().optional(),
});

export async function previewImportacaoPlanoContas(
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

		const dadosValidados = previewImportacaoPlanoContasSchema.parse(
			request.body,
		);

		const resultado = await previewImportacaoPlanoContasService({
			idempresa: dadosValidados.idempresa,
			idusuario: request.user.id,
			roles: request.user.roles,
			formato: dadosValidados.formato,
			conteudo: dadosValidados.conteudo,
			nomeArquivo: dadosValidados.nomeArquivo,
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
			error: "Erro ao gerar preview da importação do plano de contas",
			code: "PREVIEW_IMPORT_PLANO_CONTAS_ERROR",
		});
	}
}
