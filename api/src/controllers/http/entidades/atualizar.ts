import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEntidadeService } from "@/service/entidades/atualizar-entidade";

const atualizarEntidadeParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarEntidadeBodySchema = z.object({
	nome: z.string().min(1).max(60).optional(),
	cnpjcpf: z.string().min(1).max(20).optional(),
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
});

export async function atualizarEntidade(
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
		const { id } = atualizarEntidadeParamsSchema.parse(request.params);
		const dados = atualizarEntidadeBodySchema.parse(request.body);

		const resultado = await atualizarEntidadeService({
			entidadeId: id,
			idusuario,
			dados,
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
			error: "Erro ao atualizar entidade",
			code: "UPDATE_ENTIDADE_ERROR",
		});
	}
}
