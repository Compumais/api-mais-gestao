import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarPlanoContasService } from "../../../service/planocontas/listar-plano-contas.js";

/** Query string pode enviar boolean, "0"/"1" ou 0/1 (padrão do front). */
const booleanQuerySchema = z.preprocess((valor) => {
	if (valor === undefined || valor === null || valor === "") return undefined;
	if (valor === true || valor === "true" || valor === "1" || valor === 1) {
		return true;
	}
	if (valor === false || valor === "false" || valor === "0" || valor === 0) {
		return false;
	}
	return valor;
}, z.boolean().optional());

const listarPlanoContasQuerySchema = z.object({
	idempresa: z.uuid(),
	idplanocontas: z.string().optional(),
	inativo: booleanQuerySchema.default(false),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(1000).optional().default(10),
	listarTudo: booleanQuerySchema.default(false),
	tipomovimento: z.enum(["E", "S"]).optional(),
});

export async function listarPlanoContas(
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
		const query = listarPlanoContasQuerySchema.parse(request.query);

		const resultado = await listarPlanoContasService({
			idusuario,
			...query,
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
			error: "Erro ao listar planos de contas",
			code: "LIST_PLANO_CONTAS_ERROR",
		});
	}
}
