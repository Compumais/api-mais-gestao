import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_PRODUTOS_CAMPOS } from "@/repositories/produtos-repositories.js";
import { ORDENAR_PRODUTOS_CAMPOS_LISTAGEM } from "@/util/produtos-meta-colunas.js";
import { listarProdutosService } from "@/service/produto/listar-produtos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const textoOpcional = z.string().optional();

function parseFiltrosColunaJson(valor: string | undefined) {
	if (!valor?.trim()) return undefined;
	try {
		const parsed = JSON.parse(valor) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return undefined;
		}
		const record: Record<string, string> = {};
		for (const [chave, v] of Object.entries(parsed)) {
			if (typeof v === "string" && v.trim()) {
				record[chave] = v.trim();
			}
		}
		return Object.keys(record).length ? record : undefined;
	} catch {
		return undefined;
	}
}

const listarProdutosQuerySchema = z.object({
	idempresa: z.string(),
	nome: textoOpcional,
	q: textoOpcional,
	inativo: z.coerce.number().int().min(0).max(1).optional(),
	tipo: z.enum(["P", "S"]).optional(),
	codigo: textoOpcional,
	ean: textoOpcional,
	referencia: textoOpcional,
	ncm: textoOpcional,
	unidademedida: textoOpcional,
	tipoproduto: textoOpcional,
	fornecedor: textoOpcional,
	preco: textoOpcional,
	custoaquisicao: textoOpcional,
	datacadastro: textoOpcional,
	codigolistalc11603: textoOpcional,
	codigonbs: textoOpcional,
	somenteDivergencia: z
		.union([z.literal("true"), z.literal("false")])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),
	idprodutopai: z.string().min(1).optional(),
	filtrosColuna: z.string().optional().transform(parseFiltrosColunaJson),
	ordenarPor: z
		.string()
		.optional()
		.refine(
			(v) =>
				v === undefined ||
				(ORDENAR_PRODUTOS_CAMPOS_LISTAGEM as readonly string[]).includes(v),
			{ message: "Campo de ordenação inválido" },
		),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarProdutos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarProdutosQuerySchema.parse(request.query);

		const resultado = await listarProdutosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			nome: query.nome,
			q: query.q,
			inativo: query.inativo,
			tipo: query.tipo,
			codigo: query.codigo,
			ean: query.ean,
			referencia: query.referencia,
			ncm: query.ncm,
			unidademedida: query.unidademedida,
			tipoproduto: query.tipoproduto,
			fornecedor: query.fornecedor,
			preco: query.preco,
			custoaquisicao: query.custoaquisicao,
			datacadastro: query.datacadastro,
			codigolistalc11603: query.codigolistalc11603,
			codigonbs: query.codigonbs,
			somenteDivergencia: query.somenteDivergencia,
			idprodutopai: query.idprodutopai,
			filtrosColuna: query.filtrosColuna,
			ordenarPor: query.ordenarPor as (typeof ORDENAR_PRODUTOS_CAMPOS)[number] | undefined,
			ordem: query.ordem,
			page: query.page,
			limit: query.limit,
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
