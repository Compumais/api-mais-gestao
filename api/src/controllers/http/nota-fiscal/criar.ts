import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalService } from "@/service/nota-fiscal/criar-nota-fiscal.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const itemNotaFiscalSchema = z.object({
	idproduto: z.string().optional(),
	codigoproduto: z.number().int().optional(),
	ean: z.string().optional(),
	descricaoproduto: z.string().max(120).optional(),
	descricao: z.string().max(120).optional(),
	quantidade: z.union([z.string(), z.number()]).optional(),
	precounitario: z.union([z.string(), z.number()]).optional(),
	total: z.union([z.string(), z.number()]).optional(),
	desconto: z.union([z.string(), z.number()]).optional(),
	idcfop: z.string().optional(),
	cfop: z.string().max(20).optional(),
	idncm: z.string().optional(),
	ncm: z.string().max(11).optional(),
	idunidademedida: z.string().optional(),
	unidade: z.string().max(6).optional(),
	situacaotributaria: z.string().max(3).optional(),
	cstpis: z.string().max(2).optional(),
	cstcofins: z.string().max(2).optional(),
	percentualicms: z.union([z.string(), z.number()]).optional(),
	baseicms: z.union([z.string(), z.number()]).optional(),
	icms: z.union([z.string(), z.number()]).optional(),
	aliquotapis: z.union([z.string(), z.number()]).optional(),
	aliquotacofins: z.union([z.string(), z.number()]).optional(),
	pis: z.union([z.string(), z.number()]).optional(),
	cofins: z.union([z.string(), z.number()]).optional(),
	pisretido: z.union([z.string(), z.number()]).optional(),
	cofinsretido: z.union([z.string(), z.number()]).optional(),
	ipi: z.union([z.string(), z.number()]).optional(),
	inss: z.union([z.string(), z.number()]).optional(),
	frete: z.union([z.string(), z.number()]).optional(),
	seguro: z.union([z.string(), z.number()]).optional(),
	outrasdespesas: z.union([z.string(), z.number()]).optional(),
	origem: z.number().int().optional(),
	custoaquisicao: z.union([z.string(), z.number()]).optional(),
	referenciafornecedor: z.string().max(60).optional(),
	informacaoadicional: z.string().max(500).optional(),
});

const criarNotaFiscalBodySchema = z.object({
	idempresa: z.string(),
	identidade: z.string().optional().nullable(),
	numero: z.string().max(60).optional().nullable(),
	numeronotafiscal: z.string().max(11).optional().nullable(),
	serie: z.string().max(6).optional().nullable(),
	modelo: z.string().max(4).optional().nullable(),
	chavenfe: z.string().max(44).optional().nullable(),
	emissao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
	datahoraemissao: z.string().optional().nullable(),
	datahoraentradasaida: z.string().optional().nullable(),
	tipodocumento: z.string().max(2).optional().nullable(),
	idcfop: z.string().optional().nullable(),
	idoperacaofiscal: z.string().optional().nullable(),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().optional().nullable(),
	totalproduto: z.union([z.string(), z.number()]).optional().nullable(),
	totalservicos: z.union([z.string(), z.number()]).optional().nullable(),
	valortotalnota: z.union([z.string(), z.number()]).optional().nullable(),
	frete: z.union([z.string(), z.number()]).optional().nullable(),
	seguro: z.union([z.string(), z.number()]).optional().nullable(),
	outrasdespesas: z.union([z.string(), z.number()]).optional().nullable(),
	descontoproduto: z.union([z.string(), z.number()]).optional().nullable(),
	descontoservicos: z.union([z.string(), z.number()]).optional().nullable(),
	baseicms: z.union([z.string(), z.number()]).optional().nullable(),
	icms: z.union([z.string(), z.number()]).optional().nullable(),
	icmssubstituicao: z.union([z.string(), z.number()]).optional().nullable(),
	ipi: z.union([z.string(), z.number()]).optional().nullable(),
	pis: z.union([z.string(), z.number()]).optional().nullable(),
	cofins: z.union([z.string(), z.number()]).optional().nullable(),
	pisretido: z.union([z.string(), z.number()]).optional().nullable(),
	cofinsretido: z.union([z.string(), z.number()]).optional().nullable(),
	inss: z.union([z.string(), z.number()]).optional().nullable(),
	avista: z.union([z.string(), z.number()]).optional().nullable(),
	aprazo: z.union([z.string(), z.number()]).optional().nullable(),
	pesobruto: z.union([z.string(), z.number()]).optional().nullable(),
	pesoliquido: z.union([z.string(), z.number()]).optional().nullable(),
	cnpjemissor: z.string().max(14).optional().nullable(),
	razaosocial: z.string().max(60).optional().nullable(),
	inscricaoestadual: z.string().max(20).optional().nullable(),
	observacao: z.string().optional().nullable(),
	status: z.number().int().optional().nullable(),
	gerarCustos: z.boolean().optional().default(true),
	gerarFinanceiro: z.boolean().optional().default(true),
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
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const dadosNotaFiscal = {
			idempresa: dadosValidados.idempresa,
			identidade: dadosValidados.identidade ?? null,
			numero: dadosValidados.numero ?? dadosValidados.numeronotafiscal ?? null,
			numeronotafiscal: dadosValidados.numeronotafiscal ?? null,
			serie: dadosValidados.serie ?? null,
			modelo: dadosValidados.modelo ?? null,
			chavenfe: dadosValidados.chavenfe ?? null,
			emissao: dadosValidados.emissao ?? null,
			entradasaida: dadosValidados.entradasaida ?? null,
			datahoraemissao: dadosValidados.datahoraemissao ?? null,
			datahoraentradasaida: dadosValidados.datahoraentradasaida ?? null,
			tipodocumento: dadosValidados.tipodocumento ?? null,
			idcfop: dadosValidados.idcfop ?? null,
			idoperacaofiscal: dadosValidados.idoperacaofiscal ?? null,
			idplanocontas: dadosValidados.idplanocontas ?? null,
			idcondicaopagto: dadosValidados.idcondicaopagto ?? null,
			idtipodocumento: dadosValidados.idtipodocumento ?? null,
			totalproduto: paraString(dadosValidados.totalproduto),
			totalservicos: paraString(dadosValidados.totalservicos),
			valortotalnota: paraString(dadosValidados.valortotalnota),
			frete: paraString(dadosValidados.frete),
			seguro: paraString(dadosValidados.seguro),
			outrasdespesas: paraString(dadosValidados.outrasdespesas),
			descontoproduto: paraString(dadosValidados.descontoproduto),
			descontoservicos: paraString(dadosValidados.descontoservicos),
			baseicms: paraString(dadosValidados.baseicms),
			icms: paraString(dadosValidados.icms),
			icmssubstituicao: paraString(dadosValidados.icmssubstituicao),
			ipi: paraString(dadosValidados.ipi),
			pis: paraString(dadosValidados.pis),
			cofins: paraString(dadosValidados.cofins),
			pisretido: paraString(dadosValidados.pisretido),
			cofinsretido: paraString(dadosValidados.cofinsretido),
			inss: paraString(dadosValidados.inss),
			avista: paraString(dadosValidados.avista),
			aprazo: paraString(dadosValidados.aprazo),
			pesobruto: paraString(dadosValidados.pesobruto),
			pesoliquido: paraString(dadosValidados.pesoliquido),
			cnpjemissor: dadosValidados.cnpjemissor ?? null,
			razaosocial: dadosValidados.razaosocial ?? null,
			inscricaoestadual: dadosValidados.inscricaoestadual ?? null,
			observacao: dadosValidados.observacao ?? null,
			status: dadosValidados.status ?? null,
		};

		const resultado = await criarNotaFiscalService({
			idusuario: request.user.id,
			dadosNotaFiscal,
			itens: dadosValidados.itens,
			gerarCustos: dadosValidados.gerarCustos,
			gerarFinanceiro: dadosValidados.gerarFinanceiro,
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
