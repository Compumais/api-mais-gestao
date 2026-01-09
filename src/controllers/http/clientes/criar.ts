import type { FastifyReply, FastifyRequest, FastifySchema } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { criarClienteService } from "../../../service/clientes/criar-cliente";

const criarClienteBodySchema = z.object({
	nome: z.string().min(1),
	email: z.string().email().optional().nullable(),
	telefone: z.string().optional().nullable(),
	endereco: z.string().optional().nullable(),
	cidade: z.string().optional().nullable(),
	estado: z.string().optional().nullable(),
	cep: z.string().optional().nullable(),
	pais: z.string().optional().nullable(),
	empresaId: z.string().uuid(),
});

export async function criarCliente(
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

		const userId = request.user.id;
		const dadosValidados = criarClienteBodySchema.parse(request.body);
		const uuid = uuidv4();

		const dadosCliente = {
			id: uuid,
			...dadosValidados,
			criadoEm: new Date().toISOString(),
			atualizadoEm: new Date().toISOString(),
		};

		const resultado = await criarClienteService({
			dadosCliente,
			userId,
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
			error: "Erro ao criar cliente",
			code: "CREATE_CLIENTE_ERROR",
		});
	}
}
