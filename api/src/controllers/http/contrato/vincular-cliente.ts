import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { vincularClienteImportacaoContratosService } from "@/service/contrato/vincular-cliente-importacao-contratos.js";

const vincularClienteSchema = z
	.object({
		idempresa: z.uuid(),
		idtipodocumento: z.uuid(),
		acao: z.enum(["cadastrar", "associar"]),
		codigocliente: z.string().min(1).max(40),
		nome: z.string().max(120).optional(),
		identidade: z.uuid().optional(),
		contratos: z
			.array(
				z.object({
					grupocontrato: z.string().max(120),
					tipocontrato: z.string().max(120),
					descricao: z.string().min(1).max(255),
					valor: z.string().regex(/^\d+(\.\d{1,2})?$/),
					diavencimento: z.number().int().min(1).max(28),
				}),
			)
			.min(1)
			.max(5000),
	})
	.superRefine((dados, contexto) => {
		if (dados.acao === "cadastrar" && !dados.nome?.trim()) {
			contexto.addIssue({
				code: "custom",
				message: "Informe o nome do cliente",
				path: ["nome"],
			});
		}
		if (dados.acao === "associar" && !dados.identidade) {
			contexto.addIssue({
				code: "custom",
				message: "Selecione o cliente",
				path: ["identidade"],
			});
		}
	});

export async function vincularClienteImportacaoContratos(
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

		const dados = vincularClienteSchema.parse(request.body);
		const resultado = await vincularClienteImportacaoContratosService({
			idempresa: dados.idempresa,
			idusuario: request.user.id,
			idtipodocumento: dados.idtipodocumento,
			acao: dados.acao,
			codigocliente: dados.codigocliente,
			nome: dados.nome,
			identidade: dados.identidade,
			contratos: dados.contratos,
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
			error: "Erro ao vincular cliente da importação",
			code: "VINCULAR_CLIENTE_IMPORTACAO_ERROR",
		});
	}
}
