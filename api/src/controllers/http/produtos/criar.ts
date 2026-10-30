import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarProdutoService } from "@/service/produto/criar-produto.js";
import { enriquecerCamposImpostosProduto } from "@/service/produto/enriquecer-campos-impostos-produto.js";
import { sincronizarSaldoEstoqueProduto } from "@/service/produto/sincronizar-saldo-estoque-produto.js";
import {
	camposImpostosProdutoSchema,
	parseNumeroDecimal,
	refinirCamposIbsCbsProduto,
} from "@/util/campos-impostos-produto.js";
import {
	camposServicoProdutoSchema,
	montarCamposServicoProduto,
} from "@/util/campos-servico-produto.js";
import {
	corpoErroHttp,
	mapErrorToHttpResponse,
} from "@/util/map-error-to-http.js";
import { normalizarCamposNumericosProduto } from "@/util/normalizar-campos-numericos-produto.js";
import { httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const criarProdutoBodySchema = z
	.object({
		idempresa: z.string().min(1, "Empresa é obrigatória"),
		codigo: z.number().int().positive("Código deve ser positivo"),
		ean: z
			.union([z.string(), z.number()])
			.optional()
			.nullable()
			.transform((valor) => {
				if (valor === null || valor === undefined) return null;
				const digitos = String(valor).replace(/\D/g, "");
				return digitos.length > 0 ? digitos : null;
			}),
		referencia: z.string().max(60).optional().nullable(),
		nome: z.string().min(1, "Nome é obrigatório").max(120),
		idunidademedida: z.string().min(1, "Unidade de medida é obrigatória"),
		fornecedor: z.string().optional().nullable(),
		idgrupo: z.string().optional().nullable(),
		idmarca: z.string().optional().nullable(),
		idgrupogourmet: z
			.string()
			.optional()
			.nullable()
			.transform((valor) => {
				if (!valor || valor === "none") return null;
				return valor;
			}),
		preco: z.union([z.string(), z.number()], {
			error: "Preço é obrigatório",
		}),
		tipo: z.enum(["P", "S"]).default("P"),
		iat: z.enum(["A", "T"]).optional().nullable(),
		ippt: z.enum(["P", "T"]).optional().nullable(),
		origem: z.number().int().min(0).max(8).optional().nullable(),
		ncm: z.string().max(10).optional().nullable(),
		tipoproduto: z.string().max(2).optional().nullable(),
		observacoes: z.string().optional().nullable(),
		enviamobile: z.number().int().min(0).max(1).optional(),
		exibircardapiodelivery: z.number().int().min(0).max(1).optional(),
		espizza: z.number().int().min(0).max(1).optional(),
		exportaBalanca: z.number().int().min(0).max(1).optional(),
		diasValidade: z
			.number()
			.int()
			.refine(
				(valor) =>
					(valor >= 0 && valor <= 990) || valor === 998 || valor === 999,
				{ message: "Dias de validade deve ser 0 a 990, 998 ou 999" },
			)
			.optional(),
		controlalote: z.number().int().min(0).max(1).optional(),
		controlavalidade: z.number().int().min(0).max(1).optional(),
		quantidadepadrao: z.number().int().min(0).optional().nullable(),
		quantidademinima: z.number().int().min(0).optional().nullable(),
		quantidademaxima: z.number().int().positive().optional().nullable(),
		custoaquisicao: z.union([z.string(), z.number()]).optional().nullable(),
		estoque: z.number().min(0).optional(),
		idprodutopai: z.string().min(1).optional().nullable(),
		idbancoimagem: z.uuid().nullable().optional(),
		...camposImpostosProdutoSchema,
		...camposServicoProdutoSchema,
	})
	.superRefine((dados, ctx) => {
		if (dados.idprodutopai) return;
		if (dados.tipo === "S") return;
		if (!dados.idgrupo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Grupo é obrigatório",
				path: ["idgrupo"],
			});
		}
		if (!dados.ippt) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "IPPT é obrigatório",
				path: ["ippt"],
			});
		}
		refinirCamposIbsCbsProduto(dados, ctx);
	});

export async function criarProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED_ERROR",
			});
		}

		const dadosValidados = criarProdutoBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			dadosValidados.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send({
				error: "Acesso proibido",
				code: "FORBIDDEN_ERROR",
			});
		}

		const precoNumerico = parseNumeroDecimal(dadosValidados.preco);
		const preco = precoNumerico == null ? null : precoNumerico.toFixed(2);

		const custoNumerico = parseNumeroDecimal(dadosValidados.custoaquisicao);
		const custoaquisicao =
			custoNumerico == null ? null : custoNumerico.toFixed(2);

		const impostos = await enriquecerCamposImpostosProduto(dadosValidados);
		const camposServico = montarCamposServicoProduto(dadosValidados);
		const ehServico = dadosValidados.tipo === "S";

		const dadosProduto = {
			id: uuidv4(),
			idempresa: dadosValidados.idempresa,
			codigo: dadosValidados.codigo,
			ean: dadosValidados.ean ?? null,
			referencia: dadosValidados.referencia ?? null,
			nome: dadosValidados.nome,
			descricao: dadosValidados.nome.slice(0, 100),
			idunidademedida: dadosValidados.idunidademedida,
			fornecedor: dadosValidados.fornecedor ?? null,
			idgrupo: dadosValidados.idgrupo ?? null,
			idmarca: dadosValidados.idmarca ?? null,
			idgrupogourmet: dadosValidados.idgrupogourmet ?? null,
			preco,
			tipo: dadosValidados.tipo,
			iat: dadosValidados.iat ?? null,
			ippt: dadosValidados.ippt ?? (ehServico ? "T" : "P"),
			origem: dadosValidados.origem ?? 0,
			ncm: dadosValidados.ncm?.trim() || null,
			tipoproduto: dadosValidados.tipoproduto ?? (ehServico ? "09" : null),
			observacoes: dadosValidados.observacoes ?? null,
			enviamobile: dadosValidados.enviamobile ?? 0,
			exibircardapiodelivery: dadosValidados.exibircardapiodelivery ?? 0,
			espizza: dadosValidados.espizza ?? 0,
			exportaBalanca: dadosValidados.exportaBalanca ?? 0,
			diasValidade: dadosValidados.diasValidade ?? 0,
			controlalote: dadosValidados.controlalote ?? 0,
			controlavalidade: dadosValidados.controlavalidade ?? 0,
			quantidadepadrao: ehServico ? 0 : (dadosValidados.quantidadepadrao ?? 0),
			quantidademinima: ehServico
				? null
				: (dadosValidados.quantidademinima ?? null),
			quantidademaxima: ehServico
				? null
				: (dadosValidados.quantidademaxima ?? null),
			custoaquisicao,
			...impostos,
			...Object.fromEntries(
				Object.entries(camposServico).filter(
					([, valor]) =>
						valor != null && !(typeof valor === "string" && valor.trim() === ""),
				),
			),
			inativo: camposServico.inativo ?? 0,
			...(dadosValidados.idprodutopai
				? { idprodutopai: dadosValidados.idprodutopai }
				: {}),
			...(dadosValidados.idbancoimagem !== undefined
				? { idbancoimagem: dadosValidados.idbancoimagem }
				: {}),
		};

		const resultado = await criarProdutoService({
			dadosProduto: normalizarCamposNumericosProduto(dadosProduto),
			idusuario: request.user.id,
			ip: request.ip,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro ao criar produto",
				code: resultado.code ?? "BAD_REQUEST_ERROR",
			});
		}

		let avisoEstoque: string | undefined;
		if (!ehServico) {
			const quantidadeSaldo =
				dadosValidados.estoque ?? dadosValidados.quantidadepadrao;

			if (quantidadeSaldo != null && resultado.body) {
				try {
					await sincronizarSaldoEstoqueProduto({
						idempresa: dadosValidados.idempresa,
						produto: resultado.body,
						quantidade: quantidadeSaldo,
					});
				} catch (erroEstoque) {
					console.error(
						"Falha ao sincronizar saldo de estoque após criar produto:",
						erroEstoque,
					);
					const mapped = mapErrorToHttpResponse(
						erroEstoque,
						"sincronização de estoque",
					);
					avisoEstoque = mapped.error;
				}
			}
		}

		if (avisoEstoque) {
			reply.header("X-Estoque-Sync-Warning", avisoEstoque.slice(0, 200));
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error("Erro ao criar produto:", error);
		const mapped = mapErrorToHttpResponse(error, "criação do produto");
		return reply.status(mapped.status).send(corpoErroHttp(mapped));
	}
}
