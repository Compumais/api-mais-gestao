import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEntidadeService } from "@/service/entidades/criar-entidade";

const criarEntidadeBodySchema = z.object({
	nome: z.string().min(1),
	cnpjcpf: z.string().min(1).max(20),
	razaosocial: z.string().max(60).optional().nullable(),
	tipopessoa: z.number().int().min(0).max(1).optional().nullable(),
	inscricaoestadual: z.string().max(20).optional().nullable(),
	rg: z.string().max(20).optional().nullable(),
	email: z.string().email().max(200).optional().nullable(),
	telefone: z.string().max(40).optional().nullable(),
	endereco: z.string().max(60).optional().nullable(),
	numeroendereco: z.string().max(6).optional().nullable(),
	complemento: z.string().max(50).optional().nullable(),
	bairro: z.string().max(50).optional().nullable(),
	idcidade: z.string().optional().nullable(),
	idestado: z.string().optional().nullable(),
	cep: z.string().max(6).optional().nullable(),
	fax: z.string().max(40).optional().nullable(),
	nascimento: z.string().optional().nullable(),
	idplanocontas: z.string().optional().nullable(),
	pais: z.string().optional().nullable(),
	idempresa: z.string().uuid(),
});

export async function criarEntidade(
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

		const idusuario = request.user.id;
		const dadosValidados = criarEntidadeBodySchema.parse(request.body);
		const uuid = uuidv4();

		const dadosEntidade = {
			id: uuid,
			...dadosValidados,
			criadoem: new Date().toISOString(),
			atualizadoem: new Date().toISOString(),
		};

		const resultado = await criarEntidadeService({
			dadosEntidade,
			idusuario,
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
			error: "Erro ao criar entidade",
			code: "CREATE_ENTIDADE_ERROR",
		});
	}
}
