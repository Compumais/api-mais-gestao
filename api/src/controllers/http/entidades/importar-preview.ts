import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { previewImportacaoEntidadesService } from "@/service/entidades/preview-importacao-entidades.js";

const previewImportacaoEntidadesSchema = z
	.object({
		idempresa: z.uuid(),
		formato: z.enum(["csv", "xlsx"]),
		conteudo: z.string().min(1, "O conteúdo do arquivo é obrigatório"),
		nomeArquivo: z.string().optional(),
		cliente: z.number().int().min(0).max(1).optional(),
		fornecedor: z.number().int().min(0).max(1).optional(),
	})
	.refine((dados) => dados.cliente === 1 || dados.fornecedor === 1, {
		message: "Informe se a importação é de clientes ou fornecedores",
	});

export async function previewImportacaoEntidades(
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

		const dadosValidados = previewImportacaoEntidadesSchema.parse(request.body);
		const resultado = await previewImportacaoEntidadesService({
			idempresa: dadosValidados.idempresa,
			idusuario: request.user.id,
			formato: dadosValidados.formato,
			conteudo: dadosValidados.conteudo,
			nomeArquivo: dadosValidados.nomeArquivo,
			tipo: dadosValidados.cliente === 1 ? "cliente" : "fornecedor",
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
			error: "Erro ao gerar preview da importação de entidades",
			code: "PREVIEW_IMPORT_ENTIDADES_ERROR",
		});
	}
}
