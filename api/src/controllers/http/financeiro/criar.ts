import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { aplicarApropriacaoFinanceiroCompetencia } from "@/service/apropriacao-centro-custo/aplicar-apropriacao-origem.js";
import { criarFinanceiroService } from "@/service/financeiro/criar-financeiro.js";
import { criarNotificacaoService } from "@/service/notificacoes/criar-notificacao.js";

const criarFinanceiroBodySchema = z.object({
	idempresa: z.string().uuid(),
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

export async function criarFinanceiro(
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
		const dadosValidados = criarFinanceiroBodySchema.parse(request.body);
		const { apropriacoesCentroCusto, idcriteriorateio, ...resto } =
			dadosValidados;
		const uuid = uuidv4();

		const dadosFinanceiro = {
			id: uuid,
			...resto,
		};

		const resultado = await criarFinanceiroService({
			dadosFinanceiro,
			idusuario: usuarioId,
		});

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.status).send(resultado);
		}

		if (apropriacoesCentroCusto?.length) {
			const apropriacao = await aplicarApropriacaoFinanceiroCompetencia({
				idusuario: usuarioId,
				idempresa: dadosValidados.idempresa,
				idfinanceiro: resultado.body.id,
				linhas: apropriacoesCentroCusto,
				idcriteriorateio,
			});
			if (apropriacao && !apropriacao.success) {
				return reply.status(apropriacao.status).send(apropriacao);
			}
		}

		const perfilAutor = Array.isArray(request.user.roles)
			? request.user.roles
			: request.user.roles
				? [request.user.roles]
				: [];
		await criarNotificacaoService({
			tipo: "financeiro",
			idempresa: dadosValidados.idempresa,
			idrecurso: resultado.body.id,
			titulo: "Nova conta a pagar/receber criada",
			detalhes: {
				valor: resultado.body.valor,
				vencimento: resultado.body.vencimento,
				emitente: resultado.body.emitente,
			},
			idusuarioAutor: usuarioId,
			perfilAutor,
		});

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
			error: "Erro ao criar financeiro",
			code: "CREATE_FINANCEIRO_ERROR",
		});
	}
}
