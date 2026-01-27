import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarPlanoContasService } from "../../../service/planocontas/atualizar-plano-contas";

const atualizarPlanoContasParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarPlanoContasBodySchema = z.object({
	nome: z.string().optional(),
	tipomovimento: z.string().optional(),
	inativo: z.boolean().optional(),
	classe: z.string().optional(),
	idgrupodre: z.number().optional(),
	currenttimemillis: z.number().optional(),
	centrocustoobrigatorio: z.number().optional(),
	tipoconta: z.number().optional(),
	idcontacontabilintegracao: z.number().optional(),
	exportaparacontabilidade: z.number().optional(),
	idplanocontas: z.string().optional(),
});

export async function atualizarPlanoContas(
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
		const { id } = atualizarPlanoContasParamsSchema.parse(request.params);
		const dados = atualizarPlanoContasBodySchema.parse(request.body);

		const dadosAtualizacao: Record<string, unknown> = { ...dados };
		if (dados.inativo !== undefined) {
			dadosAtualizacao.inativo = dados.inativo ? 1 : 0;
		}

		const resultado = await atualizarPlanoContasService({
			idplanocontas: id,
			idusuario,
			roles: request.user.roles,
			dados: dadosAtualizacao,
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
			error: "Erro ao atualizar plano de contas",
			code: "UPDATE_PLANO_CONTAS_ERROR",
		});
	}
}
