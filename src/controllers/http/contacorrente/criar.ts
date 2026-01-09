import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { criarContaCorrenteService } from "@/service/contacorrente/criar-conta-corrente";
import { excluirContaCorrenteService } from "@/service/contacorrente/excluir";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";

const criarContaCorrenteBodySchema = z.object({
	empresaId: z.string(),
	descricao: z.string().max(50).optional(),
	agencia: z.string().max(25).optional(),
	numeroconta: z.string().max(40).optional(),
	abertura: z.coerce.date().optional(),
	observacao: z.string().max(150).optional(),
	nometitular: z.string().max(20).optional(),
	cnpjcpftitular: z.string().max(20).optional(),
	gerente: z.string().max(40).optional(),
	telefonegerente: z.string().max(20).optional(),
	codigo: z.number().int().positive().optional(),
	idbanco: z.number().int().positive().optional(),
});

export async function criarContaCorrente(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarContaCorrenteBodySchema.parse(request.body);

		const dadosContaCorrente = {
			id: uuidv4(),
			empresaId: dadosValidados.empresaId,
			descricao: dadosValidados.descricao ?? null,
			agencia: dadosValidados.agencia ?? null,
			numeroconta: dadosValidados.numeroconta ?? null,
			abertura: dadosValidados.abertura
				? dadosValidados.abertura.toISOString().split("T")[0]
				: null,
			observacao: dadosValidados.observacao ?? null,
			nometitular: dadosValidados.nometitular ?? null,
			cnpjcpftitular: dadosValidados.cnpjcpftitular ?? null,
			gerente: dadosValidados.gerente ?? null,
			telefonegerente: dadosValidados.telefonegerente ?? null,
			codigo: dadosValidados.codigo ?? null,
			idbanco: dadosValidados.idbanco ?? null,
		};

		const contaCorrente = await criarContaCorrenteService({
			usuarioId: request.user.id,
			dadosContaCorrente,
		});

		if (!contaCorrente.success) {
			return reply.status(contaCorrente.status).send(contaCorrente.error);
		}

		const auditoriaId = uuidv4();

		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			userId: request.user.id,
			acao: "criar_conta_corrente",
			recursoId: contaCorrente.body?.id ?? "",
			recurso: "conta_corrente",
			criadoEm: new Date().toISOString(),
			metadados: {
				usuario: request.user.name,
			},
		});

		if (!auditoria) {
			await excluirContaCorrenteService({
				id: contaCorrente.body!.id!,
				userId: request.user.id,
			});

			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		return reply.status(contaCorrente.status).send(contaCorrente.body);
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
