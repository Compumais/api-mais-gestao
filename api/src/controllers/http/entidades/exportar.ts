import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_ENTIDADES_CAMPOS } from "@/repositories/entidade-repositories.js";
import { exportarEntidadesService } from "@/service/entidades/exportar-entidades.js";

const textoOpcional = z.string().optional();

const exportarEntidadesQuerySchema = z
	.object({
		idempresa: z.uuid(),
		nome: textoOpcional,
		q: textoOpcional,
		razaosocial: textoOpcional,
		cnpjcpf: textoOpcional,
		endereco: textoOpcional,
		tipopessoa: z.coerce.number().int().min(0).max(1).optional(),
		indiedest: z.coerce.number().int().optional(),
		inscricaoestadual: textoOpcional,
		rg: textoOpcional,
		email: textoOpcional,
		telefone: textoOpcional,
		numeroendereco: textoOpcional,
		complemento: textoOpcional,
		bairro: textoOpcional,
		cep: textoOpcional,
		fax: textoOpcional,
		nascimento: textoOpcional,
		pais: textoOpcional,
		criadoem: textoOpcional,
		fornecedor: z.coerce.number().int().min(0).max(1).optional(),
		cliente: z.coerce.number().int().min(0).max(1).optional(),
		transportador: z.coerce.number().int().min(0).max(1).optional(),
		representante: z.coerce.number().int().min(0).max(1).optional(),
		ordenarPor: z.enum(ORDENAR_ENTIDADES_CAMPOS).optional(),
		ordem: z.enum(["asc", "desc"]).optional(),
	})
	.refine((query) => query.cliente === 1 || query.fornecedor === 1, {
		message: "Informe cliente=1 ou fornecedor=1",
	});

export async function exportarEntidades(
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

		const query = exportarEntidadesQuerySchema.parse(request.query);
		const resultado = await exportarEntidadesService({
			idusuario: request.user.id,
			...query,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!resultado.body) {
			return reply.status(500).send({
				error: "Erro ao exportar entidades",
				code: "EXPORT_ENTIDADES_ERROR",
			});
		}

		reply.header("Content-Type", resultado.body.contentType);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${resultado.body.filename}"`,
		);

		return reply.status(200).send(resultado.body.content);
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
			error: "Erro ao exportar entidades",
			code: "EXPORT_ENTIDADES_ERROR",
		});
	}
}
