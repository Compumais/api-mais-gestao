import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { produtoHistorico, produtos } from "@/repositories/schema.js";
import { db } from "./connection.js";

const CAMPOS_IGNORADOS = new Set([
	"imagem",
	"icone",
	"caminhoimagem",
	"caminhoicone",
]);

export function resumirDadosHistorico(
	dados: Record<string, unknown>,
	campos?: string[],
): Record<string, string | number | boolean | null> {
	const permitidos = campos ? new Set(campos) : undefined;
	const resumo: Record<string, string | number | boolean | null> = {};
	for (const [chave, valor] of Object.entries(dados)) {
		if (CAMPOS_IGNORADOS.has(chave) || (permitidos && !permitidos.has(chave))) {
			continue;
		}
		if (valor == null) {
			resumo[chave] = null;
		} else if (typeof valor === "number" || typeof valor === "boolean") {
			resumo[chave] = valor;
		} else if (typeof valor === "string") {
			resumo[chave] = valor.slice(0, 500);
		} else if (valor instanceof Date) {
			resumo[chave] = valor.toISOString();
		}
	}
	return resumo;
}

function normalizarIp(ip: string | undefined): string | null {
	const valor = ip?.trim();
	return valor ? valor.slice(0, 64) : null;
}

type ContextoHistorico = {
	idusuario: string;
	ip?: string | undefined;
};

export async function criarProdutoComHistorico(
	dados: NovoProduto,
	contexto: ContextoHistorico,
): Promise<Produto | undefined> {
	return db.transaction(async (tx) => {
		const [produto] = await tx.insert(produtos).values(dados).returning();
		if (!produto) return undefined;
		await tx.insert(produtoHistorico).values({
			id: uuidv4(),
			idempresa: produto.idempresa,
			idproduto: produto.id,
			idusuario: contexto.idusuario,
			ip: normalizarIp(contexto.ip),
			acao: "criar",
			antes: null,
			depois: resumirDadosHistorico(
				produto as unknown as Record<string, unknown>,
			),
		});
		return produto;
	});
}

export async function atualizarProdutoComHistorico(
	id: string,
	dados: Partial<NovoProduto>,
	contexto: ContextoHistorico,
): Promise<Produto | undefined> {
	return db.transaction(async (tx) => {
		const [antes] = await tx.select().from(produtos).where(eq(produtos.id, id));
		if (!antes) return undefined;
		const [depois] = await tx
			.update(produtos)
			.set(dados)
			.where(eq(produtos.id, id))
			.returning();
		if (!depois) return undefined;
		const campos = Object.keys(dados);
		await tx.insert(produtoHistorico).values({
			id: uuidv4(),
			idempresa: antes.idempresa,
			idproduto: id,
			idusuario: contexto.idusuario,
			ip: normalizarIp(contexto.ip),
			acao: "atualizar",
			antes: resumirDadosHistorico(
				antes as unknown as Record<string, unknown>,
				campos,
			),
			depois: resumirDadosHistorico(
				depois as unknown as Record<string, unknown>,
				campos,
			),
		});
		return depois;
	});
}

export async function atualizarProdutosEmMassaComHistorico(
	ids: string[],
	dados: Partial<NovoProduto>,
	contexto: ContextoHistorico,
): Promise<Produto[]> {
	if (ids.length === 0) return [];
	return db.transaction(async (tx) => {
		const anteriores = await tx
			.select()
			.from(produtos)
			.where(inArray(produtos.id, ids));
		const atualizados = await tx
			.update(produtos)
			.set(dados)
			.where(inArray(produtos.id, ids))
			.returning();
		const campos = Object.keys(dados);
		const porId = new Map(anteriores.map((produto) => [produto.id, produto]));
		if (atualizados.length > 0) {
			await tx.insert(produtoHistorico).values(
				atualizados.map((depois) => {
					const antes = porId.get(depois.id);
					return {
						id: uuidv4(),
						idempresa: depois.idempresa,
						idproduto: depois.id,
						idusuario: contexto.idusuario,
						ip: normalizarIp(contexto.ip),
						acao: "alterar_em_massa",
						antes: resumirDadosHistorico(
							(antes ?? {}) as Record<string, unknown>,
							campos,
						),
						depois: resumirDadosHistorico(
							depois as unknown as Record<string, unknown>,
							campos,
						),
					};
				}),
			);
		}
		return atualizados;
	});
}

export async function persistirImportacaoProdutosComHistorico(
	parametros: {
		criar: NovoProduto[];
		atualizar: { id: string; dados: Partial<NovoProduto> }[];
	},
	contexto: ContextoHistorico,
): Promise<{ criados: Produto[]; atualizados: Produto[] }> {
	return db.transaction(async (tx) => {
		const criados: Produto[] = [];
		const atualizados: Produto[] = [];
		for (const dados of parametros.criar) {
			const [produto] = await tx.insert(produtos).values(dados).returning();
			if (produto) criados.push(produto);
		}
		const idsAtualizacao = parametros.atualizar.map((item) => item.id);
		const anteriores =
			idsAtualizacao.length > 0
				? await tx
						.select()
						.from(produtos)
						.where(inArray(produtos.id, idsAtualizacao))
				: [];
		const anterioresPorId = new Map(
			anteriores.map((produto) => [produto.id, produto]),
		);
		const camposPorId = new Map<string, string[]>();
		for (const item of parametros.atualizar) {
			const [produto] = await tx
				.update(produtos)
				.set(item.dados)
				.where(eq(produtos.id, item.id))
				.returning();
			if (produto) {
				atualizados.push(produto);
				camposPorId.set(produto.id, Object.keys(item.dados));
			}
		}
		const historicos = [
			...criados.map((produto) => ({
				id: uuidv4(),
				idempresa: produto.idempresa,
				idproduto: produto.id,
				idusuario: contexto.idusuario,
				ip: normalizarIp(contexto.ip),
				acao: "importar_criar",
				antes: null,
				depois: resumirDadosHistorico(
					produto as unknown as Record<string, unknown>,
				),
			})),
			...atualizados.map((produto) => {
				const campos = camposPorId.get(produto.id) ?? [];
				return {
					id: uuidv4(),
					idempresa: produto.idempresa,
					idproduto: produto.id,
					idusuario: contexto.idusuario,
					ip: normalizarIp(contexto.ip),
					acao: "importar_atualizar",
					antes: resumirDadosHistorico(
						(anterioresPorId.get(produto.id) ?? {}) as Record<string, unknown>,
						campos,
					),
					depois: resumirDadosHistorico(
						produto as unknown as Record<string, unknown>,
						campos,
					),
				};
			}),
		];
		if (historicos.length > 0) {
			await tx.insert(produtoHistorico).values(historicos);
		}
		return { criados, atualizados };
	});
}
