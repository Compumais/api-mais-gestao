import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { aplicarApropriacaoFinanceiroCompetencia } from "@/service/apropriacao-centro-custo/aplicar-apropriacao-origem.js";
import { atualizarFinanceiroService } from "@/service/financeiro/atualizar-financeiro.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";

const atualizarFinanceiroParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarFinanceiroBodySchema = z.object({
	identidade: z.string().uuid().optional().nullable(),
	tipo: z.string().length(1).optional().nullable(),
	tipoorigem: z.number().optional().nullable(),
	idorigem: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined ? valor : String(valor),
		),
	parcela: z.number().optional().nullable(),
	documento: z.string().max(60).optional().nullable(),
	idtipodocumentofinanceiro: z.string().uuid().optional().nullable(),
	status: z.string().length(1).optional().nullable(),
	emissao: z.string().optional().nullable(),
	vencimento: z.string().optional().nullable(),
	vencimentooriginal: z.string().optional().nullable(),
	pagamento: z.string().optional().nullable(),
	baixa: z.string().optional().nullable(),
	valor: z.string().optional(),
	saldo: z.string().optional(),
	historico: z.string().optional().nullable(),
	idbanco: z.string().optional().nullable(),
	agencia: z.string().max(15).optional().nullable(),
	numerocontacorrente: z.string().max(40).optional().nullable(),
	cnpjcpfemitente: z.string().max(30).optional().nullable(),
	emitente: z.string().max(60).optional().nullable(),
	identidadedestino: z.number().optional().nullable(),
	idcodigocontabil: z.number().optional().nullable(),
	juros: z.number().optional(),
	multa: z.number().optional(),
	taxafinanciamento: z.number().optional(),
	evento: z.number().optional().nullable(),
	devolucaocodigo: z.number().optional().nullable(),
	devolucaodescricao: z.string().max(50).optional().nullable(),
	devolucaodata: z.string().optional().nullable(),
	protestodate: z.string().optional().nullable(),
	nossonumero: z.string().max(25).optional().nullable(),
	idcontageraboleto: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined ? valor : String(valor),
		),
	numerocheque: z.string().max(10).optional().nullable(),
	remessagerada: z.number().optional().nullable(),
	boletoimpresso: z.number().optional().nullable(),
	currenttimemillis: z.number().optional().nullable(),
	idtipocobranca: z.string().uuid().optional().nullable(),
	idplanocontas: z.string().uuid().optional().nullable(),
	entrada: z.string().optional().nullable(),
	datareferencia: z.string().optional().nullable(),
	idportador: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined ? valor : String(valor),
		),
	iddependente: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined ? valor : String(valor),
		),
	nomeadministradora: z.string().max(50).optional().nullable(),
	idadministradora: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined || valor === ""
				? null
				: String(valor),
		),
	nomebandeira: z.string().max(50).optional().nullable(),
	idbandeira: z
		.union([z.string(), z.number()])
		.optional()
		.nullable()
		.transform((valor) =>
			valor === null || valor === undefined || valor === ""
				? null
				: String(valor),
		),
	apropriacoesCentroCusto: z
		.array(
			z.object({
				idcentrocusto: z.string(),
				valor: z.coerce.number().optional(),
				percentual: z.coerce.number().optional().nullable(),
			}),
		)
		.optional(),
	idcriteriorateio: z.string().optional().nullable(),
});

export async function atualizarFinanceiro(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({ error: "Não autorizado" });
		}

		const { id } = atualizarFinanceiroParamsSchema.parse(request.params);
		const parsed = atualizarFinanceiroBodySchema.parse(request.body);
		const { apropriacoesCentroCusto, idcriteriorateio, ...dados } = parsed;

		const resultado = await atualizarFinanceiroService({ id, dados });

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (apropriacoesCentroCusto) {
			const financeiro = await buscarFinanceiroPorId(id);
			if (financeiro) {
				const apropriacao = await aplicarApropriacaoFinanceiroCompetencia({
					idusuario: request.user.id,
					idempresa: financeiro.idempresa,
					idfinanceiro: id,
					linhas: apropriacoesCentroCusto,
					idcriteriorateio,
				});
				if (apropriacao && !apropriacao.success) {
					return reply.status(apropriacao.status).send(apropriacao);
				}
			}
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
			error: "Erro ao atualizar financeiro",
			code: "UPDATE_FINANCEIRO_ERROR",
		});
	}
}
