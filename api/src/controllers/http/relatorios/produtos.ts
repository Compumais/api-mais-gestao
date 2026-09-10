import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import {
	exportacaoRelatorioProdutosSchema,
	filtrosRelatorioProdutosSchema,
	tipoRelatorioProdutosSchema,
} from "@/model/relatorio-produtos-model.js";
import { exportarRelatorioProdutos } from "@/service/relatorios/exportar-relatorio-produtos.service.js";
import {
	ErroRelatorioProdutos,
	gerarRelatorioProdutos,
} from "@/service/relatorios/relatorio-produtos.service.js";

const paramsSchema = z.object({ tipo: tipoRelatorioProdutosSchema });

function responderErro(error: unknown, reply: FastifyReply) {
	if (error instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: error.issues,
		});
	}
	if (error instanceof ErroRelatorioProdutos) {
		return reply.status(error.status).send({
			error: error.message,
			code: "RELATORIO_PRODUTOS_ERROR",
		});
	}
	console.error("Erro no relatório de produtos:", error);
	return reply.status(500).send({
		error: "Não foi possível gerar o relatório de produtos",
		code: "RELATORIO_PRODUTOS_ERROR",
	});
}

export async function listarRelatorioProdutosController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply
				.status(401)
				.send({ error: "Não autorizado", code: "UNAUTHORIZED" });
		}
		const { tipo } = paramsSchema.parse(request.params);
		const filtros = filtrosRelatorioProdutosSchema.parse(request.query);
		const resultado = await gerarRelatorioProdutos({
			tipo,
			filtros,
			idusuario: request.user.id,
		});
		return reply.status(200).send(resultado);
	} catch (error) {
		return responderErro(error, reply);
	}
}

export async function exportarRelatorioProdutosController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply
				.status(401)
				.send({ error: "Não autorizado", code: "UNAUTHORIZED" });
		}
		const { tipo } = paramsSchema.parse(request.params);
		const query = exportacaoRelatorioProdutosSchema.parse(request.query);
		const { formato, ...filtros } = query;
		const arquivo = await exportarRelatorioProdutos({
			tipo,
			filtros,
			formato,
			idusuario: request.user.id,
		});
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
