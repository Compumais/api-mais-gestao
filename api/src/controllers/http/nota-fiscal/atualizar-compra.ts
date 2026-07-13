import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarNotaFiscalCompraService } from "@/service/nota-fiscal/atualizar-nota-fiscal-compra.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const itemSchema = z.object({
	id: z.string().uuid(),
	descricao: z.string().optional().nullable(),
	quantidade: z.union([z.string(), z.number()]).optional().nullable(),
	precounitario: z.union([z.string(), z.number()]).optional().nullable(),
	total: z.union([z.string(), z.number()]).optional().nullable(),
	idcfop: z.string().optional().nullable(),
	cfop: z.string().optional().nullable(),
	idncm: z.string().optional().nullable(),
	ncm: z.string().optional().nullable(),
	idunidademedida: z.string().optional().nullable(),
	unidade: z.string().optional().nullable(),
	idproduto: z.string().optional().nullable(),
	desconto: z.union([z.string(), z.number()]).optional().nullable(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	identidade: z.string().optional().nullable(),
	numero: z.string().max(60).optional().nullable(),
	serie: z.string().max(6).optional().nullable(),
	modelo: z.string().max(4).optional().nullable(),
	chavenfe: z.string().max(44).optional().nullable(),
	emissao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
	idcfop: z.string().optional().nullable(),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	valortotalnota: z.union([z.string(), z.number()]).optional().nullable(),
	totalproduto: z.union([z.string(), z.number()]).optional().nullable(),
	frete: z.union([z.string(), z.number()]).optional().nullable(),
	seguro: z.union([z.string(), z.number()]).optional().nullable(),
	outrasdespesas: z.union([z.string(), z.number()]).optional().nullable(),
	descontoproduto: z.union([z.string(), z.number()]).optional().nullable(),
	observacao: z.string().optional().nullable(),
	itens: z.array(itemSchema).optional(),
	reintegrarEstoqueFinanceiro: z.boolean().optional(),
});

function paraString(valor: string | number | null | undefined): string | null {
	if (valor === undefined || valor === null) return null;
	return typeof valor === "number" ? valor.toString() : valor;
}

export async function atualizarNotaFiscalCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await atualizarNotaFiscalCompraService({
			notaFiscalId: id,
			idusuario: request.user.id,
			idempresa: body.idempresa,
			dados: {
				identidade: body.identidade,
				numero: body.numero,
				serie: body.serie,
				modelo: body.modelo,
				chavenfe: body.chavenfe,
				emissao: body.emissao,
				entradasaida: body.entradasaida,
				idcfop: body.idcfop,
				idplanocontas: body.idplanocontas,
				idcondicaopagto: body.idcondicaopagto,
				valortotalnota: paraString(body.valortotalnota),
				totalproduto: paraString(body.totalproduto),
				frete: paraString(body.frete),
				seguro: paraString(body.seguro),
				outrasdespesas: paraString(body.outrasdespesas),
				descontoproduto: paraString(body.descontoproduto),
				observacao: body.observacao,
				reintegrarEstoqueFinanceiro: body.reintegrarEstoqueFinanceiro,
				itens: body.itens?.map((item) => ({
					id: item.id,
					descricao: item.descricao,
					quantidade: paraString(item.quantidade),
					precounitario: paraString(item.precounitario),
					total: paraString(item.total),
					idcfop: item.idcfop,
					cfop: item.cfop,
					idncm: item.idncm,
					ncm: item.ncm,
					idunidademedida: item.idunidademedida,
					unidade: item.unidade,
					idproduto: item.idproduto,
					desconto: paraString(item.desconto),
				})),
			},
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
