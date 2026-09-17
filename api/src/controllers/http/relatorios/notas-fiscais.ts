import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import {
	exportacaoRelatorioNotasFiscaisSchema,
	filtrosRelatorioNotasFiscaisSchema,
} from "@/model/relatorio-notas-fiscais-model.js";
import { exportarRelatorioNotasFiscaisService } from "@/service/relatorios/exportar-relatorio-notas-fiscais.service.js";
import { listarRelatorioNotasFiscaisService } from "@/service/relatorios/listar-relatorio-notas-fiscais.service.js";

function responderErro(error: unknown, reply: FastifyReply) {
	if (error instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: error.issues,
		});
	}
	console.error("Erro no relatório de notas fiscais:", error);
	return reply.status(500).send({
		error: "Não foi possível gerar o relatório de notas fiscais",
		code: "RELATORIO_NOTAS_FISCAIS_ERROR",
	});
}

export async function listarRelatorioNotasFiscaisController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply
				.status(401)
				.send({ error: "Não autorizado", code: "UNAUTHORIZED" });
		}
		const filtros = filtrosRelatorioNotasFiscaisSchema.parse(request.query);
		const resultado = await listarRelatorioNotasFiscaisService({
			idusuario: request.user.id,
			filtros,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}
		if (!resultado.body) {
			throw new Error("Relatório retornado sem conteúdo");
		}
		return reply.status(200).send({
			data: resultado.body.data,
			resumo: resultado.body.resumo,
			paginacao: resultado.body.paginacao,
			avisos: resultado.body.avisos,
		});
	} catch (error) {
		return responderErro(error, reply);
	}
}

export async function exportarRelatorioNotasFiscaisController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply
				.status(401)
				.send({ error: "Não autorizado", code: "UNAUTHORIZED" });
		}
		const query = exportacaoRelatorioNotasFiscaisSchema.parse(request.query);
		const { formato, ...filtros } = query;
		const resultado = await exportarRelatorioNotasFiscaisService({
			idusuario: request.user.id,
			filtros,
			formato,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}
		if (!resultado.body) {
			throw new Error("Arquivo do relatório retornado sem conteúdo");
		}
		const arquivo = resultado.body;
		return reply
			.header("Content-Type", arquivo.contentType)
			.header(
				"Content-Disposition",
				`attachment; filename="${arquivo.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
			)
			.send(arquivo.content);
	} catch (error) {
		return responderErro(error, reply);
	}
}
