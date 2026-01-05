import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarPlanoContasService } from "../../service/planocontas/criar-plano-contas";

const criarPlanoContasSchema = z.object({
	empresaId: z.string(),
	codigo: z.string().optional(),
	nome: z.string(),
	tipomovimento: z.string(),
	inativo: z.boolean(),
	classe: z.string(),
	natureza: z.string(),
	planoContasId: z.string(),
	idgrupodre: z.number().optional(),
	currenttimemillis: z.number().optional(),
	centrocustoobrigatorio: z.number().optional(),
	tipoconta: z.number().optional(),
	idcontacontabilintegracao: z.number().optional(),
	exportaparacontabilidade: z.number().optional(),
});

export async function criarPlanoContas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const dadosValidados = criarPlanoContasSchema.parse(request.body);

		const dadosPlanoContas = {
			id: randomUUID(),
			empresaId: dadosValidados.empresaId,
			codigo: dadosValidados.codigo,
			nome: dadosValidados.nome,
			tipomovimento: dadosValidados.tipomovimento,
			inativo: dadosValidados.inativo ? 1 : 0,
			classe: dadosValidados.classe,
			idgrupodre: dadosValidados.idgrupodre,
			currenttimemillis: dadosValidados.currenttimemillis,
			centrocustoobrigatorio: dadosValidados.centrocustoobrigatorio,
			tipoconta: dadosValidados.tipoconta,
			idcontacontabilintegracao: dadosValidados.idcontacontabilintegracao,
			exportaparacontabilidade: dadosValidados.exportaparacontabilidade,
		};

		const planoContas = await criarPlanoContasService(dadosPlanoContas);

		return reply.status(201).send(planoContas);
	} catch (err) {
		console.error(err);

		return reply.status(500).send({
			error: "Erro ao criar plano de contas",
			code: "CREATE_PLAN_ACCOUNT_ERROR",
		});
	}
}
