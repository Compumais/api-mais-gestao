import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarNotificacaoService } from "@/service/notificacoes/criar-notificacao.js";
import { criarPlanoContasService } from "@/service/planocontas/criar-plano-contas.js";
import { buscarUsuarioPorIdService } from "@/service/usuarios/buscar.js";

const criarPlanoContasSchema = z.object({
	idempresa: z.string(),
	codigo: z.string().optional(),
	nome: z.string(),
	tipomovimento: z.enum(["E", "S"]),
	inativo: z.number().min(0).max(1),
	classe: z.string().optional(),
	natureza: z.string().optional(),
	idplanocontas: z.string().optional(),
	idgrupodre: z
		.union([z.string(), z.number()])
		.optional()
		.transform((valor) =>
			valor === undefined || valor === null ? valor : String(valor),
		),
	currenttimemillis: z.number().optional(),
	centrocustoobrigatorio: z.number().optional(),
	tipoconta: z.number().optional(),
	idcontacontabilintegracao: z.string().optional(),
	exportaparacontabilidade: z.number().optional(),
});

export async function criarPlanoContas(
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

		const usuarioId = request.user.id;

		const usuario = await buscarUsuarioPorIdService(usuarioId);

		if (!usuario) {
			return reply.status(404).send({
				error: "Usuário não encontrado",
				code: "USER_NOT_FOUND",
			});
		}

		const dadosValidados = criarPlanoContasSchema.parse(request.body);

		const dadosPlanoContas = {
			id: randomUUID(),
			idempresa: dadosValidados.idempresa,
			nome: dadosValidados.nome,
			tipomovimento: dadosValidados.tipomovimento,
			inativo: dadosValidados.inativo,
			classe: dadosValidados.classe,
			idgrupodre: dadosValidados.idgrupodre,
			currenttimemillis: dadosValidados.currenttimemillis,
			centrocustoobrigatorio: dadosValidados.centrocustoobrigatorio,
			tipoconta: dadosValidados.tipoconta,
			idcontacontabilintegracao: dadosValidados.idcontacontabilintegracao,
			exportaparacontabilidade: dadosValidados.exportaparacontabilidade,
			idplanocontas: dadosValidados.idplanocontas,
		};

		const resultado = await criarPlanoContasService(
			dadosPlanoContas,
			usuarioId,
			request.user.roles,
		);

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		const perfilAutor = Array.isArray(request.user.roles)
			? request.user.roles
			: request.user.roles
				? [request.user.roles]
				: [];
		await criarNotificacaoService({
			tipo: "plano_contas",
			idempresa: dadosValidados.idempresa,
			idrecurso: resultado.body?.id ?? null,
			titulo: "Novo plano de contas criado",
			detalhes: { nome: dadosValidados.nome, codigo: resultado.body?.codigo },
			idusuarioAutor: usuarioId,
			perfilAutor,
		});

		return reply.status(resultado.status).send(resultado.body);
	} catch (err) {
		console.error(err);

		return reply.status(500).send({
			error: "Erro ao criar plano de contas",
			code: "CREATE_PLAN_ACCOUNT_ERROR",
		});
	}
}
