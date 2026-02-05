import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { criarBancoService } from "@/service/bancos/criar-banco";
import { excluirBancoService } from "@/service/bancos/excluir-banco";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";

const criarBancoBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(6),
	nome: z.string().max(60),
});

export async function criarBanco(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarBancoBodySchema.parse(request.body);

		const dadosBanco = {
			id: uuidv4(),
			idempresa: dadosValidados.idempresa,
			codigo: dadosValidados.codigo,
			nome: dadosValidados.nome,
		};

		const banco = await criarBancoService({
			idusuario: request.user.id,
			dadosBanco,
		});

		if (!banco.success) {
			return reply.status(banco.status).send(banco);
		}

		const auditoriaId = uuidv4();

		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			idusuario: request.user.id,
			acao: "criar_banco",
			recurso: "banco",
			criadoem: new Date().toISOString(),
			metadados: {
				idbanco: banco.body?.id ?? "",
				nome: banco.body?.nome ?? "",
				codigo: banco.body?.codigo ?? "",
			},
		});

		if (!auditoria) {
			await excluirBancoService({
				id: banco.body!.id!,
				idusuario: request.user.id,
			});

			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		return reply.status(banco.status).send(banco.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
