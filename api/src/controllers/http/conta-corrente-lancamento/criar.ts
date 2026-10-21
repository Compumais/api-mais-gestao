import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { aplicarApropriacaoContaCorrenteCaixa } from "@/service/apropriacao-centro-custo/aplicar-apropriacao-origem.js";
import { criarContaCorrenteLancamentoService } from "@/service/contacorrentelancamento/criar-conta-corrente-lancamento.js";
import { criarNotificacaoService } from "@/service/notificacoes/criar-notificacao.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
} from "@/util/http-util.js";

const criarContaCorrenteLancamentoBodySchema = z.object({
	idcontacorrente: z.string(),
	datahora: z.string().optional(),
	tipo: z.enum(["E", "S", "C", "D"]).optional(),
	valor: z.string(),
	historico: z.string().optional(),
	idplanocontas: z.string().optional(),
	evento: z.number().optional(),
	debito: z.string().optional(),
	documento: z.string().max(60).optional(),
	dataconciliacao: z.string().optional(),
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

export async function criarContaCorrenteLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const parsed = criarContaCorrenteLancamentoBodySchema.parse(request.body);
		const { apropriacoesCentroCusto, idcriteriorateio, ...dadosValidados } =
			parsed;

		// Buscar conta corrente para obter idempresa
		const contaCorrente = await buscarContaCorrentePorId({
			id: dadosValidados.idcontacorrente,
		});

		if (!contaCorrente || !contaCorrente.idempresa) {
			return reply.status(httpNaoEncontrado().status).send({
				error: "Conta corrente não encontrada",
				code: "CONTA_CORRENTE_NOT_FOUND",
			});
		}

		// Mapear tipo: "E" = Entrada (C), "S" = Saída (D)
		const tipoLancamento =
			dadosValidados.tipo === "E"
				? "C"
				: dadosValidados.tipo === "S"
					? "D"
					: dadosValidados.tipo || "C";

		const dadosLancamento = {
			id: uuidv4(),
			idcontacorrente: dadosValidados.idcontacorrente,
			datahora:
				dadosValidados.datahora || new Date().toISOString().split("T")[0],
			tipo: tipoLancamento,
			valor: dadosValidados.valor,
			historico: dadosValidados.historico || null,
			idplanocontas: dadosValidados.idplanocontas || null,
			evento: dadosValidados.evento || null,
			debito: dadosValidados.debito || null,
			documento: dadosValidados.documento || null,
			dataconciliacao: dadosValidados.dataconciliacao || null,
		};

		const resultado = await criarContaCorrenteLancamentoService(
			dadosLancamento,
			request.user.id,
			contaCorrente.idempresa,
		);

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.status).send(resultado);
		}

		if (apropriacoesCentroCusto?.length) {
			const apropriacao = await aplicarApropriacaoContaCorrenteCaixa({
				idusuario: request.user.id,
				idempresa: contaCorrente.idempresa,
				idlancamento: resultado.body.id,
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
			tipo: "conta_corrente_lancamento",
			idempresa: contaCorrente.idempresa,
			idrecurso: resultado.body?.id ?? null,
			titulo: "Nova movimentação (conta corrente)",
			detalhes: {
				valor: dadosValidados.valor,
				historico: dadosValidados.historico,
				tipo: dadosLancamento.tipo,
			},
			idusuarioAutor: request.user.id,
			perfilAutor,
		});

		return reply.status(resultado.status).send(resultado.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
