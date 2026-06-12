import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioPertenceEmpresa } from "src/repositories/entidade-repositories";
import z from "zod";
import { criarNotaFiscalService } from "@/service/nota-fiscal/criar-nota-fiscal.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const itemNotaFiscalSchema = z.object({
	idproduto: z.string(),
	descricao: z.string().max(120).optional(),
	quantidade: z.union([z.string(), z.number()]).optional(),
	precounitario: z.union([z.string(), z.number()]).optional(),
	total: z.union([z.string(), z.number()]).optional(),
	desconto: z.union([z.string(), z.number()]).optional(),
	cfop: z.string().max(20).optional(),
	ncm: z.string().max(11).optional(),
	unidade: z.string().max(6).optional(),
	custoaquisicao: z.union([z.string(), z.number()]).optional(),
	baseicms: z.union([z.string(), z.number()]).optional(),
	icms: z.union([z.string(), z.number()]).optional(),
	ipi: z.union([z.string(), z.number()]).optional(),
});

const criarNotaFiscalBodySchema = z.object({
	idempresa: z.string(),
	identidade: z.string().optional().nullable(),
	numero: z.string().max(60).optional().nullable(),
	serie: z.string().max(6).optional().nullable(),
	modelo: z.string().max(4).optional().nullable(),
	chavenfe: z.string().max(44).optional().nullable(),
	emissao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
	datahoraemissao: z.string().optional().nullable(),
	tipodocumento: z.string().max(2).optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	valortotalnota: z.union([z.string(), z.number()]).optional().nullable(),
	totalproduto: z.union([z.string(), z.number()]).optional().nullable(),
	frete: z.union([z.string(), z.number()]).optional().nullable(),
	seguro: z.union([z.string(), z.number()]).optional().nullable(),
	outrasdespesas: z.union([z.string(), z.number()]).optional().nullable(),
	descontoproduto: z.union([z.string(), z.number()]).optional().nullable(),
	icms: z.union([z.string(), z.number()]).optional().nullable(),
	ipi: z.union([z.string(), z.number()]).optional().nullable(),
	observacao: z.string().optional().nullable(),
	status: z.number().int().optional().nullable(),
	gerarCustos: z.boolean().optional().default(true),
	itens: z.array(itemNotaFiscalSchema).min(1),
});

function paraString(valor: string | number | null | undefined): string | null {
	if (valor === undefined || valor === null) return null;
	return typeof valor === "number" ? valor.toString() : valor;
}

export async function criarNotaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarNotaFiscalBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			dadosValidados.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido().success);
		}

		const dadosNotaFiscal = {
			idempresa: dadosValidados.idempresa,
			identidade: dadosValidados.identidade ?? null,
			numero: dadosValidados.numero ?? null,
			serie: dadosValidados.serie ?? null,
			modelo: dadosValidados.modelo ?? null,
			chavenfe: dadosValidados.chavenfe ?? null,
			emissao: dadosValidados.emissao ?? null,
			entradasaida: dadosValidados.entradasaida ?? null,
			datahoraemissao: dadosValidados.datahoraemissao ?? null,
			tipodocumento: dadosValidados.tipodocumento ?? null,
			idcondicaopagto: dadosValidados.idcondicaopagto ?? null,
			valortotalnota: paraString(dadosValidados.valortotalnota),
			totalproduto: paraString(dadosValidados.totalproduto),
			frete: paraString(dadosValidados.frete),
			seguro: paraString(dadosValidados.seguro),
			outrasdespesas: paraString(dadosValidados.outrasdespesas),
			descontoproduto: paraString(dadosValidados.descontoproduto),
			icms: paraString(dadosValidados.icms),
			ipi: paraString(dadosValidados.ipi),
			observacao: dadosValidados.observacao ?? null,
			status: dadosValidados.status ?? null,
		};

		const resultado = await criarNotaFiscalService({
			idusuario: request.user.id,
			dadosNotaFiscal,
			itens: dadosValidados.itens,
			gerarCustos: dadosValidados.gerarCustos,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
