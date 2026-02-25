import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { excluirBancoService } from "@/service/bancos/excluir-banco.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirBancoParamsSchema = z.object({
	id: z.string(),
});

export async function excluirBanco(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = excluirBancoParamsSchema.parse(request.params);

		const auditoriaId = uuidv4();

		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			idusuario: request.user.id,
			acao: "excluir_banco",
			recurso: "banco",
			criadoem: new Date().toISOString(),
			metadados: {
				usuario: request.user.name,
				bancoId: id,
			},
		});

		if (!auditoria) {
			return reply
				.status(httpErroInterno().status)
				.send(httpErroInterno().error);
		}

		const resultado = await excluirBancoService({
			id,
			idusuario,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir banco",
			code: "DELETE_BANCO_ERROR",
		});
	}
}
