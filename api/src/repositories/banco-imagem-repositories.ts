import {
	and,
	asc,
	eq,
	ilike,
	inArray,
	or,
	sql,
} from "drizzle-orm";
import {
	bancoimagemcodigo,
	bancoimagemgrupo,
	bancoimagemproduto,
	produtoimagem,
	produtos,
} from "@/repositories/schema.js";
import { codigosEquivalentes } from "@/util/normalizar-codigo-barras.js";
import { db } from "./connection.js";

export type GrupoBanco = typeof bancoimagemgrupo.$inferSelect;
export type ProdutoBanco = typeof bancoimagemproduto.$inferSelect;
export type CodigoBanco = typeof bancoimagemcodigo.$inferSelect;

function agora(): string {
	return new Date().toISOString();
}

export async function listarGruposBanco(): Promise<GrupoBanco[]> {
	return db
		.select()
		.from(bancoimagemgrupo)
		.orderBy(asc(bancoimagemgrupo.ordem), asc(bancoimagemgrupo.nome));
}

export async function buscarGrupoBancoPorId(
	id: string,
): Promise<GrupoBanco | undefined> {
	const [grupo] = await db
		.select()
		.from(bancoimagemgrupo)
		.where(eq(bancoimagemgrupo.id, id))
		.limit(1);
	return grupo;
}

export async function inserirGrupoBanco(
	grupo: typeof bancoimagemgrupo.$inferInsert,
): Promise<GrupoBanco | undefined> {
	const [criado] = await db.insert(bancoimagemgrupo).values(grupo).returning();
	return criado;
}

export async function atualizarGrupoBanco(
	id: string,
	dados: Partial<typeof bancoimagemgrupo.$inferInsert>,
): Promise<GrupoBanco | undefined> {
	const [grupo] = await db
		.update(bancoimagemgrupo)
		.set({ ...dados, atualizadoem: agora() })
		.where(eq(bancoimagemgrupo.id, id))
		.returning();
	return grupo;
}

export async function excluirGrupoBanco(id: string): Promise<void> {
	await db.delete(bancoimagemgrupo).where(eq(bancoimagemgrupo.id, id));
}

export async function listarProdutosBanco(
	idgrupo?: string,
): Promise<ProdutoBanco[]> {
	const consulta = db.select().from(bancoimagemproduto);
	const linhas = idgrupo
		? await consulta
				.where(eq(bancoimagemproduto.idgrupo, idgrupo))
				.orderBy(asc(bancoimagemproduto.nome))
		: await consulta.orderBy(asc(bancoimagemproduto.nome));
	return linhas;
}

export async function buscarProdutosBancoPorIds(
	ids: string[],
): Promise<ProdutoBanco[]> {
	if (ids.length === 0) return [];
	return db
		.select()
		.from(bancoimagemproduto)
		.where(inArray(bancoimagemproduto.id, ids));
}

export async function buscarProdutoBancoPorId(
	id: string,
): Promise<ProdutoBanco | undefined> {
	const [produto] = await db
		.select()
		.from(bancoimagemproduto)
		.where(eq(bancoimagemproduto.id, id))
		.limit(1);
	return produto;
}

export async function inserirProdutoBanco(
	produto: typeof bancoimagemproduto.$inferInsert,
): Promise<ProdutoBanco | undefined> {
	const [criado] = await db
		.insert(bancoimagemproduto)
		.values(produto)
		.returning();
	return criado;
}

export async function atualizarProdutoBanco(
	id: string,
	dados: Partial<typeof bancoimagemproduto.$inferInsert>,
): Promise<ProdutoBanco | undefined> {
	const [produto] = await db
		.update(bancoimagemproduto)
		.set({ ...dados, atualizadoem: agora() })
		.where(eq(bancoimagemproduto.id, id))
		.returning();
	return produto;
}

export async function excluirProdutoBanco(id: string): Promise<void> {
	await db.delete(bancoimagemproduto).where(eq(bancoimagemproduto.id, id));
}

export async function listarCodigosBanco(
	idsProduto: string[],
): Promise<CodigoBanco[]> {
	if (idsProduto.length === 0) return [];
	return db
		.select()
		.from(bancoimagemcodigo)
		.where(inArray(bancoimagemcodigo.idproduto, idsProduto))
		.orderBy(asc(bancoimagemcodigo.codigo));
}

export async function substituirCodigosBanco(
	idproduto: string,
	codigos: Array<{ id: string; codigo: string }>,
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.delete(bancoimagemcodigo)
			.where(eq(bancoimagemcodigo.idproduto, idproduto));
		if (codigos.length === 0) return;
		await tx.insert(bancoimagemcodigo).values(
			codigos.map((codigo) => ({
				id: codigo.id,
				idproduto,
				codigo: codigo.codigo,
			})),
		);
	});
}

export async function buscarProdutoBancoPorCodigo(
	codigo: string,
): Promise<ProdutoBanco | undefined> {
	const equivalentes = codigosEquivalentes(codigo);
	const [exato] = await db
		.select({ produto: bancoimagemproduto })
		.from(bancoimagemcodigo)
		.innerJoin(
			bancoimagemproduto,
			eq(bancoimagemcodigo.idproduto, bancoimagemproduto.id),
		)
		.where(eq(bancoimagemcodigo.codigo, codigo))
		.limit(1);
	if (exato) return exato.produto;

	const semZeros = equivalentes[equivalentes.length - 1] ?? codigo;
	const [equivalente] = await db
		.select({ produto: bancoimagemproduto })
		.from(bancoimagemcodigo)
		.innerJoin(
			bancoimagemproduto,
			eq(bancoimagemcodigo.idproduto, bancoimagemproduto.id),
		)
		.where(sql`ltrim(${bancoimagemcodigo.codigo}, '0') = ${semZeros}`)
		.limit(1);
	return equivalente?.produto;
}

export async function buscarIdsProdutosBanco(params: {
	texto?: string | undefined;
	codigo?: string | undefined;
	idgrupo?: string | undefined;
	somenteAtivos: boolean;
	limite: number;
}): Promise<string[]> {
	const filtros = [];
	if (params.somenteAtivos) {
		filtros.push(eq(bancoimagemproduto.ativo, true));
		filtros.push(eq(bancoimagemgrupo.ativo, true));
	}
	if (params.idgrupo) {
		filtros.push(eq(bancoimagemproduto.idgrupo, params.idgrupo));
	}
	if (params.codigo) {
		const equivalentes = codigosEquivalentes(params.codigo);
		const semZeros = equivalentes[equivalentes.length - 1] ?? params.codigo;
		filtros.push(
			or(
				eq(bancoimagemcodigo.codigo, params.codigo),
				sql`ltrim(${bancoimagemcodigo.codigo}, '0') = ${semZeros}`,
			),
		);
	}
	if (params.texto) {
		const like = `%${params.texto}%`;
		const digitos = params.texto.replace(/\D/g, "");
		const alternativas = [
			ilike(bancoimagemproduto.nome, like),
			ilike(bancoimagemgrupo.nome, like),
			digitos ? ilike(bancoimagemcodigo.codigo, `%${digitos}%`) : undefined,
		].filter((item) => item !== undefined);
		if (alternativas.length > 0) {
			filtros.push(or(...alternativas));
		}
	}

	const linhas = await db
		.select({
			id: bancoimagemproduto.id,
			nome: bancoimagemproduto.nome,
		})
		.from(bancoimagemproduto)
		.innerJoin(
			bancoimagemgrupo,
			eq(bancoimagemproduto.idgrupo, bancoimagemgrupo.id),
		)
		.leftJoin(
			bancoimagemcodigo,
			eq(bancoimagemcodigo.idproduto, bancoimagemproduto.id),
		)
		.where(filtros.length > 0 ? and(...filtros) : undefined)
		.orderBy(asc(bancoimagemproduto.nome))
		.limit(params.limite * 20);

	const ids: string[] = [];
	const vistos = new Set<string>();
	for (const linha of linhas) {
		if (vistos.has(linha.id)) continue;
		vistos.add(linha.id);
		ids.push(linha.id);
		if (ids.length >= params.limite) break;
	}
	return ids;
}

export async function produtoEmpresaTemMidiaPropria(
	idproduto: string,
): Promise<boolean> {
	const [imagem] = await db
		.select({ id: produtoimagem.id })
		.from(produtoimagem)
		.where(eq(produtoimagem.idproduto, idproduto))
		.limit(1);
	return Boolean(imagem);
}

export async function limparCaminhoImagemDosVinculos(
	idsBanco: string[],
): Promise<void> {
	if (idsBanco.length === 0) return;
	await db.execute(sql`
		UPDATE produtos AS p
		SET caminhoimagem = NULL
		WHERE p.idbancoimagem IN (${sql.join(
			idsBanco.map((id) => sql`${id}`),
			sql`, `,
		)})
		AND NOT EXISTS (
			SELECT 1 FROM produtoimagem i WHERE i.idproduto = p.id
		)
		AND COALESCE(p.imagem, '') = ''
	`);
}

export async function atualizarCaminhoImagemDosVinculos(params: {
	idbanco: string;
	token: string | null;
}): Promise<void> {
	if (!params.token) {
		await limparCaminhoImagemDosVinculos([params.idbanco]);
		return;
	}
	await db.execute(sql`
		UPDATE produtos AS p
		SET caminhoimagem = '/produtos/' || p.id || '/imagem?v=' || ${params.token}
		WHERE p.idbancoimagem = ${params.idbanco}
		AND NOT EXISTS (
			SELECT 1 FROM produtoimagem i WHERE i.idproduto = p.id
		)
		AND COALESCE(p.imagem, '') = ''
	`);
}

export async function definirPonteiroProdutoEmpresa(params: {
	idproduto: string;
	idbancoimagem: string | null;
	caminhoimagem: string | null;
}): Promise<void> {
	await db
		.update(produtos)
		.set({
			idbancoimagem: params.idbancoimagem,
			caminhoimagem: params.caminhoimagem,
		})
		.where(eq(produtos.id, params.idproduto));
}

export async function limparPonteiroBancoProduto(
	idproduto: string,
): Promise<void> {
	await db
		.update(produtos)
		.set({ idbancoimagem: null })
		.where(eq(produtos.id, idproduto));
}
