import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_PRODUTOS_CAMPOS } from "@/repositories/produtos-repositories.js";
import { exportarProdutosService } from "@/service/produto/exportar-produtos.js";

const textoOpcional = z.string().optional();

const exportarProdutosQuerySchema = z.object({
	idempresa: z.uuid(),
	formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
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
	ordenarPor: z.enum(ORDENAR_PRODUTOS_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
});

export async function exportarProdutos(
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

		const query = exportarProdutosQuerySchema.parse(request.query);
		const resultado = await exportarProdutosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			formato: query.tipo === "S" ? "csv" : query.formato,
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
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!resultado.body) {
			return reply.status(500).send({
				error: "Erro ao exportar produtos",
				code: "EXPORT_PRODUTOS_ERROR",
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
			error: "Erro ao exportar produtos",
			code: "EXPORT_PRODUTOS_ERROR",
		});
	}
}
