import type { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { gravarXmlNfceArquivo } from "../fiscal/xml-local";
import {
	montarItemPizzaMeioAMeio,
	produtoEhPizza,
} from "../util/pizza-meio-a-meio";
import {
	arredondarMoeda,
	recalcularTotaisConta,
	type TotaisContaGourmet,
	valorRestante,
} from "./conta-gourmet";
import {
	execute,
	garantirMesas,
	getConfig,
	query,
	queryOne,
	setConfig,
	withTransaction,
} from "./database";
import {
	type LancamentoPagamento,
	type MeioPagamento,
	type StatusLancamentoPagamento,
	totaisParaSync,
	validarFechamentoPagamentos,
} from "./pagamento";
import {
	calcularConferenciaCaixa,
	montarResumoTurnoCaixa,
	type ResumoTurnoCaixa,
	type VendaParaResumoTurno,
} from "./resumo-turno-caixa";

export type {
	LancamentoPagamento,
	MeioPagamento,
	StatusLancamentoPagamento,
} from "./pagamento";
export type { ResumoTurnoCaixa } from "./resumo-turno-caixa";

export type SessaoLocal = {
	token: string | null;
	userid: string | null;
	username: string | null;
	idempresa: string | null;
	nomeempresa: string | null;
	roles?: string | null;
	modulogourmet?: string | null;
};

export type ProdutoLocal = {
	id: string;
	descricao: string;
	preco: number;
	unidademedida: string | null;
	idunidademedida: string | null;
	ean: string | null;
	codigo: number | null;
	idgrupo: string | null;
	idgrupogourmet: string | null;
	espizza: number;
	imagem: string | null;
	caminhoimagem: string | null;
};

export type GrupoLocal = {
	id: string;
	nome: string;
};

export type ItemCarrinho = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
	unidademedida?: string | null;
	idunidademedida?: string | null;
};

export type VendaLocal = {
	id: string;
	idempresa: string;
	numeropdv: number;
	origem: string;
	status: string;
	meio_pagamento: string;
	valortotal: number;
	valordinheiro: number;
	valorpix: number;
	valorcartao: number;
	valortroco: number;
	valordesconto?: number;
	valortaxaservico?: number;
	valorcouvert?: number;
	criadoem: string;
	idremoto: string | null;
	sync_status: string;
	nfce_status: string;
	idnfce_local: string | null;
};

export type ContaMesaLocal = {
	id: string;
	numero_mesa: number;
	status: string;
	nomecliente: string | null;
	abertoem: string;
	valortotal: number;
	numeropessoas: number;
	subtotal: number;
	valordesconto: number;
	valortaxaservico: number;
	valorcouvert: number;
	taxa_ativa: number;
	valorpago: number;
	valorrestante: number;
	itens: Array<{
		id: string;
		idproduto: string;
		descricao: string;
		quantidade: number;
		precounitario: number;
		precototal: number;
		observacao: string | null;
	}>;
};

export type PedidoFilaLocal = {
	id: string;
	client_order_id: string;
	idconta: string;
	numero_mesa: number;
	nomecliente: string | null;
	idproduto: string;
	descricao: string;
	quantidade: number;
	observacao: string | null;
	status: string;
	criadoem: string;
	entregueem: string | null;
};

export type OutboxItem = {
	id: string;
	tipo: string;
	payload: string;
	status: string;
	tentativas: number;
	ultimo_erro: string | null;
	criadoem: string;
};

export async function obterSessao(): Promise<SessaoLocal> {
	const row = await queryOne<SessaoLocal>("SELECT * FROM sessao WHERE id = 1");
	if (!row) {
		throw new Error("Sessão local não inicializada");
	}
	return row;
}

export async function salvarSessao(
	dados: Partial<SessaoLocal>,
): Promise<SessaoLocal> {
	const atual = await obterSessao();
	const next = { ...atual, ...dados };
	await execute(
		`UPDATE sessao SET token = $1, userid = $2, username = $3, idempresa = $4, nomeempresa = $5, roles = $6, modulogourmet = $7, atualizadoem = $8 WHERE id = 1`,
		[
			next.token,
			next.userid,
			next.username,
			next.idempresa,
			next.nomeempresa,
			next.roles,
			next.modulogourmet,
			new Date().toISOString(),
		],
	);
	return obterSessao();
}

export async function limparSessao(): Promise<void> {
	await salvarSessao({
		token: null,
		userid: null,
		username: null,
		idempresa: null,
		nomeempresa: null,
		roles: null,
		modulogourmet: null,
	});
}

const PRODUTO_SELECT =
	"id, descricao, preco, unidademedida, idunidademedida, ean, codigo, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem";

function padraoIlike(termo: string): string {
	return `%${termo.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function padraoIlikePrefixo(termo: string): string {
	return `${termo.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

export async function upsertProdutos(
	produtos: Array<{
		id: string;
		descricao: string;
		preco: number;
		unidademedida?: string | null;
		idunidademedida?: string | null;
		ean?: string | null;
		codigo?: number | null;
		idgrupo?: string | null;
		idgrupogourmet?: string | null;
		espizza?: number | null;
		imagem?: string | null;
		caminhoimagem?: string | null;
	}>,
): Promise<void> {
	const agora = new Date().toISOString();
	await withTransaction(async (client) => {
		for (const p of produtos) {
			await execute(
				`INSERT INTO produto_cache (id, descricao, preco, unidademedida, idunidademedida, ean, codigo, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem, inativo, atualizadoem)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13)
				 ON CONFLICT (id) DO UPDATE SET
					descricao = excluded.descricao,
					preco = excluded.preco,
					unidademedida = excluded.unidademedida,
					idunidademedida = excluded.idunidademedida,
					ean = excluded.ean,
					codigo = excluded.codigo,
					idgrupo = excluded.idgrupo,
					idgrupogourmet = excluded.idgrupogourmet,
					espizza = excluded.espizza,
					imagem = excluded.imagem,
					caminhoimagem = excluded.caminhoimagem,
					atualizadoem = excluded.atualizadoem`,
				[
					p.id,
					p.descricao,
					p.preco,
					p.unidademedida ?? null,
					p.idunidademedida ?? null,
					p.ean ?? null,
					p.codigo ?? null,
					p.idgrupo ?? null,
					p.idgrupogourmet ?? null,
					p.espizza ? 1 : 0,
					p.imagem ?? null,
					p.caminhoimagem ?? null,
					agora,
				],
				client,
			);
		}
	});
}

export async function upsertGrupos(
	grupos: Array<{ id: string; nome: string }>,
): Promise<void> {
	const agora = new Date().toISOString();
	await withTransaction(async (client) => {
		for (const g of grupos) {
			await execute(
				`INSERT INTO grupo (id, nome, atualizadoem)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (id) DO UPDATE SET
					nome = excluded.nome,
					atualizadoem = excluded.atualizadoem`,
				[g.id, g.nome, agora],
				client,
			);
		}
	});
}

export async function listarGruposLocal(): Promise<GrupoLocal[]> {
	return query<GrupoLocal>(
		`SELECT DISTINCT g.id, g.nome
		 FROM grupo g
		 JOIN produto_cache p ON p.idgrupo = g.id AND p.inativo = 0
		 ORDER BY g.nome`,
	);
}

export async function upsertGruposGourmet(
	grupos: Array<{ id: string; nome: string }>,
): Promise<void> {
	const agora = new Date().toISOString();
	await withTransaction(async (client) => {
		for (const g of grupos) {
			await execute(
				`INSERT INTO grupo_gourmet (id, nome, atualizadoem)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (id) DO UPDATE SET
					nome = excluded.nome,
					atualizadoem = excluded.atualizadoem`,
				[g.id, g.nome, agora],
				client,
			);
		}
	});
}

export async function listarGruposGourmetLocal(): Promise<GrupoLocal[]> {
	return query<GrupoLocal>(
		`SELECT DISTINCT g.id, g.nome
		 FROM grupo_gourmet g
		 JOIN produto_cache p ON p.idgrupogourmet = g.id AND p.inativo = 0
		 ORDER BY g.nome`,
	);
}

export async function listarProdutosPorGrupoGourmet(
	idgrupogourmet: string,
	termo = "",
	limit = 200,
): Promise<ProdutoLocal[]> {
	const q = termo.trim();
	if (!idgrupogourmet) {
		if (!q) {
			return query<ProdutoLocal>(
				`SELECT ${PRODUTO_SELECT}
				 FROM produto_cache
				 WHERE inativo = 0 AND idgrupogourmet IS NOT NULL AND idgrupogourmet <> ''
				 ORDER BY descricao LIMIT $1`,
				[limit],
			);
		}
		return query<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache
			 WHERE inativo = 0 AND idgrupogourmet IS NOT NULL AND idgrupogourmet <> ''
				AND (descricao ILIKE $1 ESCAPE '\\' OR ean ILIKE $2 ESCAPE '\\')
			 ORDER BY descricao LIMIT $3`,
			[padraoIlike(q), padraoIlike(q), limit],
		);
	}
	if (!q) {
		return query<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND idgrupogourmet = $1
			 ORDER BY descricao LIMIT $2`,
			[idgrupogourmet, limit],
		);
	}
	return query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND idgrupogourmet = $1
		   AND (descricao ILIKE $2 ESCAPE '\\' OR ean ILIKE $3 ESCAPE '\\')
		 ORDER BY descricao LIMIT $4`,
		[idgrupogourmet, padraoIlike(q), padraoIlike(q), limit],
	);
}

export async function listarPizzasLocal(
	excetoId = "",
	limit = 200,
): Promise<ProdutoLocal[]> {
	if (!excetoId) {
		return query<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache
			 WHERE inativo = 0 AND espizza = 1
			 ORDER BY descricao LIMIT $1`,
			[limit],
		);
	}
	return query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND espizza = 1 AND id <> $1
		 ORDER BY descricao LIMIT $2`,
		[excetoId, limit],
	);
}

export type MapeamentoImpressoraGourmet = {
	idgrupogourmet: string;
	nome: string;
	destino: string;
	impressora_nome: string;
	host: string;
	porta: number;
};

export async function listarMapeamentoImpressorasGourmet(): Promise<
	MapeamentoImpressoraGourmet[]
> {
	const rows = await query<{
		idgrupogourmet: string;
		nome: string;
		destino: string | null;
		impressora_nome: string | null;
		host: string | null;
		porta: number | null;
	}>(
		`SELECT g.id AS idgrupogourmet, g.nome,
			COALESCE(i.destino, '') AS destino,
			COALESCE(i.impressora_nome, '') AS impressora_nome,
			COALESCE(i.host, '') AS host,
			COALESCE(i.porta, 9100) AS porta
		 FROM grupo_gourmet g
		 LEFT JOIN impressora_grupo_gourmet i ON i.idgrupogourmet = g.id
		 ORDER BY g.nome`,
	);
	return rows.map((row) => ({
		...row,
		destino: row.destino || (row.impressora_nome ? "sistema" : ""),
		impressora_nome: row.impressora_nome ?? "",
		host: row.host ?? "",
		porta: Number(row.porta) || 9100,
	}));
}

export async function salvarMapeamentoImpressorasGourmet(
	itens: Array<{
		idgrupogourmet: string;
		destino?: string;
		impressora_nome?: string;
		host?: string;
		porta?: number;
	}>,
): Promise<void> {
	await withTransaction(async (client) => {
		await execute("DELETE FROM impressora_grupo_gourmet", [], client);
		for (const item of itens) {
			const destino = (item.destino ?? "").trim();
			if (destino !== "sistema" && destino !== "rede") {
				continue;
			}
			const nome = (item.impressora_nome ?? "").trim();
			const host = (item.host ?? "").trim();
			const porta = Number(item.porta) > 0 ? Number(item.porta) : 9100;
			if (destino === "sistema" && !nome) {
				continue;
			}
			if (destino === "rede" && !host) {
				continue;
			}
			await execute(
				`INSERT INTO impressora_grupo_gourmet (idgrupogourmet, impressora_nome, destino, host, porta)
				 VALUES ($1, $2, $3, $4, $5)`,
				[item.idgrupogourmet, nome, destino, host, porta],
				client,
			);
		}
	});
}

export async function obterDestinoGrupoGourmet(
	idgrupogourmet: string,
): Promise<{
	tipo: "sistema" | "rede";
	nome?: string;
	host?: string;
	porta?: number;
} | null> {
	const row = await queryOne<{
		destino: string;
		impressora_nome: string;
		host: string;
		porta: number;
	}>(
		`SELECT destino, impressora_nome, host, porta
		 FROM impressora_grupo_gourmet WHERE idgrupogourmet = $1`,
		[idgrupogourmet],
	);
	if (!row) {
		return null;
	}
	const destino = row.destino?.trim() || (row.impressora_nome ? "sistema" : "");
	if (destino === "rede") {
		const host = row.host?.trim();
		if (!host) {
			return null;
		}
		return {
			tipo: "rede",
			host,
			porta: Number(row.porta) || 9100,
		};
	}
	if (destino === "sistema") {
		const nome = row.impressora_nome?.trim();
		if (!nome) {
			return null;
		}
		return { tipo: "sistema", nome };
	}
	return null;
}

export async function buscarProdutosLocal(
	termo = "",
	limit = 50,
): Promise<ProdutoLocal[]> {
	const q = termo.trim();
	if (!q) {
		return query<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0
			 ORDER BY descricao LIMIT $1`,
			[limit],
		);
	}
	const contem = padraoIlike(q);
	const prefixo = padraoIlikePrefixo(q);
	return query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND (
			descricao ILIKE $1 ESCAPE '\\'
			OR ean ILIKE $1 ESCAPE '\\'
			OR id ILIKE $1 ESCAPE '\\'
			OR CAST(codigo AS TEXT) ILIKE $1 ESCAPE '\\'
		 )
		 ORDER BY
			CASE WHEN descricao ILIKE $2 ESCAPE '\\' THEN 0 ELSE 1 END,
			descricao
		 LIMIT $3`,
		[contem, prefixo, limit],
	);
}

export async function listarProdutosPorGrupo(
	idgrupo: string,
	termo = "",
	limit = 200,
): Promise<ProdutoLocal[]> {
	const q = termo.trim();
	if (!q) {
		return query<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND idgrupo = $1
			 ORDER BY descricao LIMIT $2`,
			[idgrupo, limit],
		);
	}
	return query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND idgrupo = $1
		   AND (descricao ILIKE $2 ESCAPE '\\' OR ean ILIKE $3 ESCAPE '\\')
		 ORDER BY descricao LIMIT $4`,
		[idgrupo, padraoIlike(q), padraoIlike(q), limit],
	);
}

export async function buscarProdutoPorCodigo(
	codigo: number,
): Promise<ProdutoLocal | null> {
	if (!Number.isInteger(codigo) || codigo < 1) {
		return null;
	}
	return (
		(await queryOne<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND codigo = $1
			 LIMIT 1`,
			[codigo],
		)) ?? null
	);
}

export async function buscarProdutoPorEan(
	ean: string,
): Promise<ProdutoLocal | null> {
	const codigo = ean.trim();
	if (!codigo) {
		return null;
	}
	return (
		(await queryOne<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT}
			 FROM produto_cache WHERE inativo = 0 AND (ean = $1 OR id = $2)
			 LIMIT 1`,
			[codigo, codigo],
		)) ?? null
	);
}

export async function buscarProdutoPorId(
	id: string,
): Promise<ProdutoLocal | null> {
	if (!id) {
		return null;
	}
	return (
		(await queryOne<ProdutoLocal>(
			`SELECT ${PRODUTO_SELECT} FROM produto_cache WHERE id = $1 LIMIT 1`,
			[id],
		)) ?? null
	);
}

export async function listarAtalhos(): Promise<ProdutoLocal[]> {
	return query<ProdutoLocal>(
		`SELECT p.id, p.descricao, p.preco, p.unidademedida, p.idunidademedida, p.ean, p.codigo, p.idgrupo, p.idgrupogourmet, p.espizza, p.imagem, p.caminhoimagem
		 FROM atalho a
		 JOIN produto_cache p ON p.id = a.idproduto
		 WHERE p.inativo = 0
		 ORDER BY a.ordem`,
	);
}

export async function listarCatalogoCarga(): Promise<{
	grupos: GrupoLocal[];
	gruposGourmet: GrupoLocal[];
	produtos: ProdutoLocal[];
	atalhos: ProdutoLocal[];
	atualizadoem: string;
}> {
	const grupos = await query<GrupoLocal>(
		"SELECT id, nome FROM grupo ORDER BY nome",
	);
	const gruposGourmet = await query<GrupoLocal>(
		"SELECT id, nome FROM grupo_gourmet ORDER BY nome",
	);
	const produtos = await query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT} FROM produto_cache WHERE inativo = 0 ORDER BY descricao`,
	);
	const atalhos = await listarAtalhos();
	return {
		grupos,
		gruposGourmet,
		produtos,
		atalhos,
		atualizadoem: new Date().toISOString(),
	};
}

export async function salvarAtalhos(ids: string[]): Promise<void> {
	await withTransaction(async (client) => {
		await execute("DELETE FROM atalho", [], client);
		for (let i = 0; i < ids.length; i++) {
			await execute(
				"INSERT INTO atalho (ordem, idproduto) VALUES ($1, $2)",
				[i + 1, ids[i]],
				client,
			);
		}
	});
}

export async function enfileirarOutbox(
	tipo: string,
	payload: unknown,
	client?: PoolClient,
): Promise<string> {
	const id = uuidv4();
	await execute(
		`INSERT INTO outbox (id, tipo, payload, status, tentativas, criadoem)
		 VALUES ($1, $2, $3, 'pendente', 0, $4)`,
		[id, tipo, JSON.stringify(payload), new Date().toISOString()],
		client,
	);
	return id;
}

export async function listarOutboxPendentes(limit = 50): Promise<OutboxItem[]> {
	return query<OutboxItem>(
		`SELECT id, tipo, payload, status, tentativas, ultimo_erro, criadoem
		 FROM outbox WHERE status = 'pendente'
		 ORDER BY criadoem ASC LIMIT $1`,
		[limit],
	);
}

export async function marcarOutboxConcluido(id: string): Promise<void> {
	await execute(
		`UPDATE outbox SET status = 'concluido', processadoem = $1, ultimo_erro = NULL WHERE id = $2`,
		[new Date().toISOString(), id],
	);
}

export async function marcarOutboxErro(
	id: string,
	erro: string,
): Promise<void> {
	await execute(
		`UPDATE outbox SET tentativas = tentativas + 1, ultimo_erro = $1 WHERE id = $2`,
		[erro, id],
	);
}

export async function contarOutboxPendentes(): Promise<number> {
	const row = await queryOne<{ total: number }>(
		`SELECT COUNT(*)::int as total FROM outbox WHERE status = 'pendente'`,
	);
	return row?.total ?? 0;
}

/** Conclui outbox `criar_venda` já espelhado online (evita duplicar na retaguarda). */
export async function concluirOutboxCriarVendaLocal(
	idlocal: string,
): Promise<void> {
	for (const item of await listarOutboxPendentes(200)) {
		if (item.tipo !== "criar_venda") continue;
		try {
			const payload = JSON.parse(item.payload) as { idlocal?: string };
			if (payload.idlocal === idlocal) {
				await marcarOutboxConcluido(item.id);
			}
		} catch {
			// payload inválido — deixa a fila tratar
		}
	}
}

export async function caixaAberto(): Promise<{
	id: string;
	numeropdv: number;
	abertoem: string;
	valorabertura: number;
	idusuario: string | null;
	username: string | null;
	idremoto: string | null;
} | null> {
	const sessao = await obterSessao();
	if (!sessao.userid) {
		return null;
	}
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	return (
		(await queryOne<{
			id: string;
			numeropdv: number;
			abertoem: string;
			valorabertura: number;
			idusuario: string | null;
			username: string | null;
			idremoto: string | null;
		}>(
			`SELECT id, numeropdv, abertoem, valorabertura, idusuario, username, idremoto
			 FROM caixa_turno
			 WHERE status = 'aberto' AND idusuario = $1 AND numeropdv = $2
			 ORDER BY abertoem DESC LIMIT 1`,
			[sessao.userid, numeropdv],
		)) ?? null
	);
}

export async function caixaAbertoOutroOperador(): Promise<{
	username: string | null;
	abertoem: string;
} | null> {
	const sessao = await obterSessao();
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	if (!sessao.userid) {
		return (
			(await queryOne<{ username: string | null; abertoem: string }>(
				`SELECT username, abertoem FROM caixa_turno
				 WHERE status = 'aberto' AND numeropdv = $1
				 ORDER BY abertoem DESC LIMIT 1`,
				[numeropdv],
			)) ?? null
		);
	}
	return (
		(await queryOne<{ username: string | null; abertoem: string }>(
			`SELECT username, abertoem FROM caixa_turno
			 WHERE status = 'aberto' AND numeropdv = $1
			   AND (idusuario IS NULL OR idusuario <> $2)
			 ORDER BY abertoem DESC LIMIT 1`,
			[numeropdv, sessao.userid],
		)) ?? null
	);
}

export async function abrirCaixa(valorabertura: number): Promise<{
	id: string;
	abertoem: string;
	valorabertura: number;
}> {
	const existente = await caixaAberto();
	if (existente) {
		return existente;
	}
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.userid) {
		throw new Error("Faça login antes de abrir o caixa");
	}
	const id = uuidv4();
	const agora = new Date().toISOString();
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	await execute(
		`INSERT INTO caixa_turno (
			id, idempresa, numeropdv, idusuario, username, abertoem, valorabertura, status, sync_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'aberto', 'pendente')`,
		[
			id,
			sessao.idempresa,
			numeropdv,
			sessao.userid,
			sessao.username,
			agora,
			valorabertura,
		],
	);
	await enfileirarOutbox("abrir_caixa", {
		idlocal: id,
		idempresa: sessao.idempresa,
		idusuario: sessao.userid,
		numeropdv,
		valorabertura,
		abertoem: agora,
	});
	return { id, abertoem: agora, valorabertura };
}

export type CaixaTurnoLocal = {
	id: string;
	idempresa: string;
	numeropdv: number;
	idusuario: string | null;
	username: string | null;
	abertoem: string;
	fechadoem: string | null;
	valorabertura: number;
	valorfechamento: number | null;
	status: string;
	idremoto: string | null;
};

export async function obterCaixaTurno(
	id: string,
): Promise<CaixaTurnoLocal | null> {
	return (
		(await queryOne<CaixaTurnoLocal>(
			`SELECT id, idempresa, numeropdv, idusuario, username, abertoem, fechadoem,
		        valorabertura, valorfechamento, status, idremoto
		 FROM caixa_turno WHERE id = $1`,
			[id],
		)) ?? null
	);
}

export async function atualizarCaixaIdRemoto(
	id: string,
	idremoto: string,
): Promise<void> {
	await execute(
		`UPDATE caixa_turno SET idremoto = $1, sync_status = 'sincronizado' WHERE id = $2`,
		[idremoto, id],
	);
}

export async function calcularResumoTurno(caixa: {
	numeropdv: number;
	abertoem: string;
	valorabertura: number;
}): Promise<ResumoTurnoCaixa> {
	const vendas = await query<VendaParaResumoTurno>(
		`SELECT
			v.valortotal,
			v.valordinheiro,
			v.valorpix,
			v.valorcartao,
			v.valortroco,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'DINHEIRO'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_dinheiro,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'PIX'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_pix,
			COALESCE((
				SELECT SUM(p.valor) FROM pagamento p
				WHERE p.idvenda = v.id
					AND p.meio = 'CARTAO'
					AND COALESCE(p.status, 'ok') = 'ok'
			), 0) AS lanc_cartao
		 FROM venda v
		 WHERE v.numeropdv = $1 AND v.criadoem >= $2 AND v.status = 'fechada'
		 ORDER BY v.criadoem`,
		[caixa.numeropdv, caixa.abertoem],
	);
	return montarResumoTurnoCaixa({
		valorabertura: caixa.valorabertura,
		vendas,
	});
}

export async function calcularResumoTurnoAberto(): Promise<ResumoTurnoCaixa> {
	const caixa = await caixaAberto();
	if (!caixa) {
		throw new Error("Nenhum caixa aberto para este operador");
	}
	return calcularResumoTurno(caixa);
}

export async function fecharCaixa(params: {
	saldoinformado: number;
	observacao?: string | null;
}): Promise<{
	numeropdv: number;
	username: string | null;
	abertoem: string;
	fechadoem: string;
	resumo: ResumoTurnoCaixa;
	conferencia: ReturnType<typeof calcularConferenciaCaixa>;
	observacao: string | null;
	nomeempresa: string | null;
}> {
	const caixa = await caixaAberto();
	if (!caixa) {
		throw new Error("Nenhum caixa aberto para este operador");
	}
	const resumo = await calcularResumoTurno(caixa);
	const conferencia = calcularConferenciaCaixa(
		params.saldoinformado,
		resumo.saldoCaixaFisico,
	);
	const agora = new Date().toISOString();
	const observacao = params.observacao?.trim() || null;
	await execute(
		`UPDATE caixa_turno SET status = 'fechado', fechadoem = $1, valorfechamento = $2, sync_status = 'pendente' WHERE id = $3`,
		[agora, conferencia.saldoinformado, caixa.id],
	);
	const sessao = await obterSessao();
	await enfileirarOutbox("fechamento_caixa", {
		idlocal: caixa.id,
		idremoto: caixa.idremoto,
		idempresa: sessao.idempresa,
		idusuario: caixa.idusuario,
		numeropdv: caixa.numeropdv,
		valorabertura: caixa.valorabertura,
		abertoem: caixa.abertoem,
		fechadoem: agora,
		saldoinformado: conferencia.saldoinformado,
		saldoconferido: conferencia.saldoinformado,
		saldoapurado: resumo.saldoapurado,
		saldoCaixaFisico: resumo.saldoCaixaFisico,
		sobra: conferencia.sobra,
		falta: conferencia.falta,
		observacao,
		qtdVendas: resumo.qtdVendas,
		pagamentos: resumo.pagamentos,
		valorfechamento: conferencia.saldoinformado,
	});
	return {
		numeropdv: caixa.numeropdv,
		username: caixa.username,
		abertoem: caixa.abertoem,
		fechadoem: agora,
		resumo,
		conferencia,
		observacao,
		nomeempresa: sessao.nomeempresa,
	};
}

export async function listarLancamentosVenda(
	idvenda: string,
	client?: PoolClient,
): Promise<LancamentoPagamento[]> {
	const rows = await query<{
		id: string;
		meio: MeioPagamento;
		valor: number;
		nsu: string | null;
		autorizacao: string | null;
		bandeira: string | null;
		status: StatusLancamentoPagamento;
	}>(
		`SELECT id, meio, valor, nsu, autorizacao, bandeira, status
		 FROM pagamento WHERE idvenda = $1 ORDER BY criadoem`,
		[idvenda],
		client,
	);
	return rows.map((row) => ({
		id: row.id,
		meio: row.meio,
		valor: Number(row.valor),
		nsu: row.nsu,
		autorizacao: row.autorizacao,
		bandeira: row.bandeira,
		status: row.status ?? "ok",
	}));
}

async function gravarLancamentosVenda(
	client: PoolClient,
	idvenda: string,
	lancamentos: LancamentoPagamento[],
	agora: string,
): Promise<void> {
	for (const lanc of lancamentos) {
		await execute(
			`INSERT INTO pagamento (
				id, idvenda, meio, valor, nsu, autorizacao, bandeira, status, criadoem
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				lanc.id ?? uuidv4(),
				idvenda,
				lanc.meio,
				lanc.valor,
				lanc.nsu ?? null,
				lanc.autorizacao ?? null,
				lanc.bandeira ?? null,
				lanc.status ?? "ok",
				agora,
			],
			client,
		);
	}
}

type ContaGourmetRow = {
	id: string;
	numero_mesa: number;
	status: string;
	nomecliente: string | null;
	abertoem: string;
	valortotal: number;
	numeropessoas?: number | null;
	valordesconto?: number | null;
	valortaxaservico?: number | null;
	valorcouvert?: number | null;
	taxa_ativa?: number | null;
};

async function percentualTaxaConfig(): Promise<number> {
	const n = Number(await getConfig("taxa_servico_percentual", "10"));
	return Number.isFinite(n) && n >= 0 ? n : 10;
}

async function couvertConfig(): Promise<number> {
	const n = Number(await getConfig("couvert_valor", "0"));
	return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function listarItensAbertos(
	idconta: string,
	client?: PoolClient,
): Promise<ContaMesaLocal["itens"]> {
	return query<ContaMesaLocal["itens"][number]>(
		`SELECT id, idproduto, descricao, quantidade, precounitario, precototal, observacao
		 FROM item_conta
		 WHERE idconta = $1 AND COALESCE(pago, 0) = 0
		 ORDER BY criadoem`,
		[idconta],
		client,
	);
}

async function somarPagoConta(
	idconta: string,
	client?: PoolClient,
): Promise<number> {
	const row = await queryOne<{ total: number | string | null }>(
		`SELECT COALESCE(SUM(valor), 0) as total
		 FROM conta_pagamento
		 WHERE idconta = $1 AND COALESCE(status, 'ok') = 'ok'`,
		[idconta],
		client,
	);
	return arredondarMoeda(Number(row?.total ?? 0));
}

async function listarPagamentosConta(
	idconta: string,
	client?: PoolClient,
): Promise<LancamentoPagamento[]> {
	const rows = await query<{
		id: string;
		meio: MeioPagamento;
		valor: number;
		nsu: string | null;
		autorizacao: string | null;
		bandeira: string | null;
		status: StatusLancamentoPagamento;
	}>(
		`SELECT id, meio, valor, nsu, autorizacao, bandeira, status
		 FROM conta_pagamento WHERE idconta = $1 ORDER BY criadoem`,
		[idconta],
		client,
	);
	return rows.map((row) => ({
		id: row.id,
		meio: row.meio,
		valor: Number(row.valor),
		nsu: row.nsu,
		autorizacao: row.autorizacao,
		bandeira: row.bandeira,
		status: row.status ?? "ok",
	}));
}

async function persistirTotaisConta(
	idconta: string,
	totais: TotaisContaGourmet,
	taxaAtiva: boolean,
	client?: PoolClient,
): Promise<void> {
	await execute(
		`UPDATE conta_mesa SET
			valortotal = $1,
			numeropessoas = $2,
			valordesconto = $3,
			valortaxaservico = $4,
			valorcouvert = $5,
			taxa_ativa = $6,
			sync_status = 'pendente'
		 WHERE id = $7`,
		[
			totais.valortotal,
			totais.numeropessoas,
			totais.valordesconto,
			totais.valortaxaservico,
			totais.valorcouvert,
			taxaAtiva ? 1 : 0,
			idconta,
		],
		client,
	);
}

async function recalcularContaPersistida(
	idconta: string,
	client?: PoolClient,
): Promise<TotaisContaGourmet> {
	const conta = await queryOne<ContaGourmetRow>(
		"SELECT * FROM conta_mesa WHERE id = $1",
		[idconta],
		client,
	);
	if (!conta) {
		throw new Error("Conta inválida");
	}
	const itens = await listarItensAbertos(idconta, client);
	const percentualTaxa = await percentualTaxaConfig();
	const pessoas = Number(conta.numeropessoas) || 1;
	const valorcouvert = Number(conta.valorcouvert) || 0;
	const totais = recalcularTotaisConta(itens, {
		numeropessoas: pessoas,
		taxaAtiva: Number(conta.taxa_ativa) === 1,
		percentualTaxa,
		couvertUnitario: valorcouvert / Math.max(1, pessoas),
		desconto: Number(conta.valordesconto) || 0,
	});
	await persistirTotaisConta(
		idconta,
		totais,
		Number(conta.taxa_ativa) === 1,
		client,
	);
	return totais;
}

function montarContaLocal(
	conta: ContaGourmetRow,
	itens: ContaMesaLocal["itens"],
	valorpago: number,
): ContaMesaLocal {
	const subtotal = arredondarMoeda(
		itens.reduce((acc, i) => acc + Number(i.precototal), 0),
	);
	const valortotal = arredondarMoeda(Number(conta.valortotal) || 0);
	return {
		id: conta.id,
		numero_mesa: conta.numero_mesa,
		status: conta.status,
		nomecliente: conta.nomecliente,
		abertoem: conta.abertoem,
		valortotal,
		numeropessoas: Number(conta.numeropessoas) || 1,
		subtotal,
		valordesconto: arredondarMoeda(Number(conta.valordesconto) || 0),
		valortaxaservico: arredondarMoeda(Number(conta.valortaxaservico) || 0),
		valorcouvert: arredondarMoeda(Number(conta.valorcouvert) || 0),
		taxa_ativa: Number(conta.taxa_ativa) === 1 ? 1 : 0,
		valorpago,
		valorrestante: valorRestante(valortotal, valorpago),
		itens,
	};
}

export async function criarVendaRapida(params: {
	itens: ItemCarrinho[];
	lancamentos: LancamentoPagamento[];
	troco?: number;
}): Promise<VendaLocal> {
	const sessao = await obterSessao();
	if (!sessao.idempresa || !sessao.userid) {
		throw new Error("Sessão inválida");
	}
	if (!(await caixaAberto())) {
		throw new Error("Abra o caixa antes de vender");
	}
	if (!params.itens.length) {
		throw new Error("Carrinho vazio");
	}

	const id = uuidv4();
	const agora = new Date().toISOString();
	const total = params.itens.reduce((acc, i) => acc + i.precototal, 0);
	const fechamento = validarFechamentoPagamentos({
		total,
		lancamentos: params.lancamentos,
		troco: params.troco,
	});
	const sync = totaisParaSync(fechamento.efetivos, fechamento.troco);
	const numeropdv = Number(await getConfig("numeropdv", "1"));

	const venda = await withTransaction(async (client) => {
		await execute(
			`INSERT INTO venda (
				id, idempresa, numeropdv, origem, status, meio_pagamento,
				valortotal, valordinheiro, valorpix, valorcartao, valortroco,
				criadoem, sync_status, nfce_status
			) VALUES ($1, $2, $3, 'rapida', 'fechada', $4, $5, $6, $7, $8, $9, $10, 'pendente', 'pendente')`,
			[
				id,
				sessao.idempresa,
				numeropdv,
				fechamento.meio,
				total,
				sync.valordinheiro,
				sync.valorpix,
				sync.valorcartaocredito,
				fechamento.troco,
				agora,
			],
			client,
		);

		for (const item of params.itens) {
			await execute(
				`INSERT INTO item_venda (id, idvenda, idproduto, descricao, quantidade, precounitario, precototal)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					uuidv4(),
					id,
					item.idproduto,
					item.descricao,
					item.quantidade,
					item.precounitario,
					item.precototal,
				],
				client,
			);
		}

		await gravarLancamentosVenda(client, id, fechamento.efetivos, agora);

		const row = await queryOne<VendaLocal>(
			"SELECT * FROM venda WHERE id = $1",
			[id],
			client,
		);
		if (!row) {
			throw new Error("Falha ao gravar venda");
		}
		return row;
	});

	await enfileirarOutbox("criar_venda", {
		idlocal: id,
		meio: fechamento.meio,
		pagamentos: fechamento.efetivos,
		valordinheiro: sync.valordinheiro,
		valorpix: sync.valorpix,
		valorcartao: sync.valorcartaocredito,
		itens: params.itens,
		valortotal: total,
		valortroco: fechamento.troco,
	});

	return venda;
}

export async function listarVendas(limit = 100): Promise<VendaLocal[]> {
	return query<VendaLocal>(
		`SELECT * FROM venda ORDER BY criadoem DESC LIMIT $1`,
		[limit],
	);
}

export async function listarVendasComRemoto(
	limit = 40,
): Promise<Array<Pick<VendaLocal, "id" | "idremoto" | "nfce_status">>> {
	return query<Pick<VendaLocal, "id" | "idremoto" | "nfce_status">>(
		`SELECT id, idremoto, nfce_status FROM venda
		 WHERE idremoto IS NOT NULL AND nfce_status <> 'nao_fiscal'
		 ORDER BY criadoem DESC LIMIT $1`,
		[limit],
	);
}

export async function obterVenda(
	id: string,
): Promise<
	| (VendaLocal & { itens: ItemCarrinho[]; pagamentos: LancamentoPagamento[] })
	| null
> {
	const venda = await queryOne<VendaLocal>(
		"SELECT * FROM venda WHERE id = $1",
		[id],
	);
	if (!venda) {
		return null;
	}
	const itens = await query<ItemCarrinho>(
		`SELECT idproduto, descricao, quantidade, precounitario, precototal
		 FROM item_venda WHERE idvenda = $1`,
		[id],
	);
	const pagamentos = await listarLancamentosVenda(id);
	return { ...venda, itens, pagamentos };
}

export async function atualizarVendaSync(
	idlocal: string,
	dados: {
		idremoto?: string;
		sync_status?: string;
		nfce_status?: string;
		idnfce_local?: string;
	},
): Promise<void> {
	const atual = await obterVenda(idlocal);
	if (!atual) {
		return;
	}
	await execute(
		`UPDATE venda SET idremoto = COALESCE($1, idremoto), sync_status = COALESCE($2, sync_status),
		 nfce_status = COALESCE($3, nfce_status), idnfce_local = COALESCE($4, idnfce_local) WHERE id = $5`,
		[
			dados.idremoto ?? null,
			dados.sync_status ?? null,
			dados.nfce_status ?? null,
			dados.idnfce_local ?? null,
			idlocal,
		],
	);
}

export async function limparContasVazias(): Promise<number> {
	const vazias = await query<{ id: string; numero_mesa: number }>(
		`SELECT c.id, c.numero_mesa
		 FROM conta_mesa c
		 WHERE c.status = 'aberta'
		   AND NOT EXISTS (
		     SELECT 1 FROM item_conta i
		     WHERE i.idconta = c.id AND COALESCE(i.pago, 0) = 0
		   )
		   AND NOT EXISTS (
		     SELECT 1 FROM conta_pagamento p
		     WHERE p.idconta = c.id AND COALESCE(p.status, 'ok') = 'ok'
		   )`,
	);

	await withTransaction(async (client) => {
		for (const conta of vazias) {
			await execute(
				`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL
				 WHERE numero = $1 AND (idconta = $2 OR idconta IS NULL)`,
				[conta.numero_mesa, conta.id],
				client,
			);
			await execute("DELETE FROM conta_mesa WHERE id = $1", [conta.id], client);

			const pendentes = await query<{ id: string; payload: string }>(
				`SELECT id, payload FROM outbox WHERE status = 'pendente' AND tipo = 'conta_mesa'`,
				[],
				client,
			);
			const agora = new Date().toISOString();
			for (const o of pendentes) {
				try {
					const p = JSON.parse(o.payload) as {
						idlocal?: string;
						idconta?: string;
					};
					if (p.idlocal === conta.id || p.idconta === conta.id) {
						await execute(
							`UPDATE outbox SET status = 'cancelado', processadoem = $1 WHERE id = $2`,
							[agora, o.id],
							client,
						);
					}
				} catch {
					// payload inválido: ignora
				}
			}
		}

		await execute(
			`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL
			 WHERE status = 'ocupada'
			   AND (
			     idconta IS NULL
			     OR idconta NOT IN (SELECT id FROM conta_mesa WHERE status = 'aberta')
			   )`,
			[],
			client,
		);
	});
	return vazias.length;
}

export async function listarMesas(): Promise<
	Array<{
		numero: number;
		status: string;
		idconta: string | null;
		nomecliente: string | null;
		valortotal: number;
		abertoem: string | null;
		ultimoLancamento: string | null;
		statusAtividade: "livre" | "consumindo" | "ociosa";
		qtdItens: number;
	}>
> {
	await limparContasVazias();

	const limiarMin = Number(await getConfig("tempo_ociosidade_min", "15"));
	const limiarMs = (limiarMin === 30 ? 30 : 15) * 60 * 1000;
	const agora = Date.now();

	const rows = await query<{
		numero: number;
		status: string;
		idconta: string | null;
		nomecliente: string | null;
		valortotal: number;
		abertoem: string | null;
		ultimo_lancamento: string | null;
		qtd_itens: number;
	}>(
		`SELECT m.numero, m.status, m.idconta, m.nomecliente,
			COALESCE(c.valortotal, 0) as valortotal,
			c.abertoem as abertoem,
			(
				SELECT MAX(i.criadoem) FROM item_conta i WHERE i.idconta = m.idconta
			) as ultimo_lancamento,
			(
				SELECT COUNT(*)::int FROM item_conta i
				WHERE i.idconta = m.idconta AND COALESCE(i.pago, 0) = 0
			) as qtd_itens
		 FROM mesa m
		 LEFT JOIN conta_mesa c ON c.id = m.idconta AND c.status = 'aberta'
		 ORDER BY m.numero`,
	);

	return rows.map((row) => {
		const realmenteOcupada =
			row.status === "ocupada" && row.idconta && row.qtd_itens > 0;
		let statusAtividade: "livre" | "consumindo" | "ociosa" = "livre";
		if (realmenteOcupada) {
			const referencia = row.ultimo_lancamento ?? row.abertoem;
			const refMs = referencia ? new Date(referencia).getTime() : Number.NaN;
			if (!Number.isFinite(refMs) || agora - refMs > limiarMs) {
				statusAtividade = "ociosa";
			} else {
				statusAtividade = "consumindo";
			}
		}
		return {
			numero: row.numero,
			status: realmenteOcupada ? "ocupada" : "livre",
			idconta: realmenteOcupada ? row.idconta : null,
			nomecliente: realmenteOcupada ? row.nomecliente : null,
			valortotal: realmenteOcupada ? row.valortotal : 0,
			abertoem: realmenteOcupada ? row.abertoem : null,
			ultimoLancamento: realmenteOcupada ? row.ultimo_lancamento : null,
			statusAtividade,
			qtdItens: realmenteOcupada ? row.qtd_itens : 0,
		};
	});
}

export async function listarNumerosComPendencia(): Promise<string[]> {
	const rows = await query<{ numero: number }>(
		`SELECT m.numero
		 FROM mesa m
		 INNER JOIN conta_mesa c ON c.id = m.idconta AND c.status = 'aberta'
		 WHERE m.status = 'ocupada'
		   AND EXISTS (
		     SELECT 1 FROM item_conta i
		     WHERE i.idconta = m.idconta AND COALESCE(i.pago, 0) = 0
		   )
		 ORDER BY m.numero`,
	);
	return rows.map((row) => String(row.numero));
}

export async function obterMesa(numero: number): Promise<{
	numero: number;
	status: string;
	idconta: string | null;
	nomecliente: string | null;
	valortotal: number;
	qtdItens: number;
}> {
	const lista = await listarMesas();
	const mesa = lista.find((m) => m.numero === numero);
	if (!mesa) {
		const rotulo =
			(await getConfig("modelo_atendimento", "mesa")) === "comanda"
				? "Comanda"
				: "Mesa";
		throw new Error(`${rotulo} não encontrada`);
	}
	return {
		numero: mesa.numero,
		status: mesa.status,
		idconta: mesa.idconta,
		nomecliente: mesa.nomecliente,
		valortotal: mesa.valortotal,
		qtdItens: mesa.qtdItens,
	};
}

export async function obterContaPorNumero(
	numero: number,
): Promise<ContaMesaLocal | null> {
	await limparContasVazias();
	const mesa = await queryOne<{ status: string; idconta: string | null }>(
		"SELECT status, idconta FROM mesa WHERE numero = $1",
		[numero],
	);
	if (!mesa || mesa.status !== "ocupada" || !mesa.idconta) {
		return null;
	}
	const conta = await obterContaMesa(mesa.idconta);
	if (!conta || conta.status !== "aberta" || conta.itens.length === 0) {
		return null;
	}
	return conta;
}

export async function abrirContaMesa(
	numero: number,
	nomecliente?: string,
): Promise<ContaMesaLocal> {
	const sessao = await obterSessao();
	if (!sessao.idempresa) {
		throw new Error("Empresa não selecionada");
	}
	const mesa = await queryOne<{ status: string; idconta: string | null }>(
		"SELECT * FROM mesa WHERE numero = $1",
		[numero],
	);
	if (!mesa) {
		const rotulo =
			(await getConfig("modelo_atendimento", "mesa")) === "comanda"
				? "Comanda"
				: "Mesa";
		throw new Error(`${rotulo} não encontrada`);
	}
	if (mesa.status === "ocupada" && mesa.idconta) {
		const existente = await obterContaMesa(mesa.idconta);
		if (existente && existente.itens.length > 0) {
			return existente;
		}
		await limparContasVazias();
	}

	const id = uuidv4();
	const agora = new Date().toISOString();
	await withTransaction(async (client) => {
		await execute(
			`INSERT INTO conta_mesa (
				id, numero_mesa, idempresa, status, nomecliente, abertoem, valortotal,
				numeropessoas, valordesconto, valortaxaservico, valorcouvert, taxa_ativa, sync_status
			) VALUES ($1, $2, $3, 'aberta', $4, $5, 0, 1, 0, 0, 0, 0, 'pendente')`,
			[id, numero, sessao.idempresa, nomecliente ?? null, agora],
			client,
		);
		await execute(
			`UPDATE mesa SET status = 'ocupada', idconta = $1, nomecliente = $2 WHERE numero = $3`,
			[id, nomecliente ?? null, numero],
			client,
		);
	});

	await enfileirarOutbox("conta_mesa", {
		acao: "abrir",
		idlocal: id,
		numero,
		nomecliente: nomecliente ?? null,
	});

	const criada = await obterContaMesa(id);
	if (!criada) {
		throw new Error("Falha ao abrir conta");
	}
	return criada;
}

export async function obterContaMesa(
	id: string,
): Promise<ContaMesaLocal | null> {
	const conta = await queryOne<ContaGourmetRow>(
		"SELECT * FROM conta_mesa WHERE id = $1",
		[id],
	);
	if (!conta) {
		return null;
	}
	const itens = await listarItensAbertos(id);
	const valorpago = await somarPagoConta(id);
	return montarContaLocal(conta, itens, valorpago);
}

export async function adicionarItemConta(
	idconta: string,
	item: {
		idproduto: string;
		descricao: string;
		quantidade: number;
		precounitario: number;
		observacao?: string | null;
	},
): Promise<ContaMesaLocal> {
	const conta = await obterContaMesa(idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	const id = uuidv4();
	const precototal = item.quantidade * item.precounitario;
	const agora = new Date().toISOString();
	const observacao = item.observacao?.trim() || null;
	await withTransaction(async (client) => {
		await execute(
			`INSERT INTO item_conta (id, idconta, idproduto, descricao, quantidade, precounitario, precototal, observacao, criadoem)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				id,
				idconta,
				item.idproduto,
				item.descricao,
				item.quantidade,
				item.precounitario,
				precototal,
				observacao,
				agora,
			],
			client,
		);
		await execute(
			`UPDATE conta_mesa SET sync_status = 'pendente' WHERE id = $1`,
			[idconta],
			client,
		);
		await recalcularContaPersistida(idconta, client);
	});

	await enfileirarOutbox("conta_mesa", {
		acao: "item",
		idconta,
		item: { ...item, precototal },
	});

	const atualizada = await obterContaMesa(idconta);
	if (!atualizada) {
		throw new Error("Falha ao atualizar conta");
	}
	return atualizada;
}

/** Cria a conta na primeira inserção; se já existir conta aberta, só lança o item. */
export async function adicionarItemNaMesa(
	numero: number,
	item: {
		idproduto: string;
		descricao: string;
		quantidade: number;
		precounitario: number;
	},
	nomecliente?: string,
): Promise<ContaMesaLocal> {
	const existente = await obterContaPorNumero(numero);
	if (existente) {
		return adicionarItemConta(existente.id, item);
	}
	const conta = await abrirContaMesa(numero, nomecliente);
	return adicionarItemConta(conta.id, item);
}

export async function atualizarNomeClienteConta(
	idconta: string,
	nomecliente: string,
): Promise<ContaMesaLocal> {
	const conta = await obterContaMesa(idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	const nome = nomecliente.trim() || "Cliente";
	await execute(
		"UPDATE conta_mesa SET nomecliente = $1, sync_status = 'pendente' WHERE id = $2",
		[nome, idconta],
	);
	await execute("UPDATE mesa SET nomecliente = $1 WHERE idconta = $2", [
		nome,
		idconta,
	]);
	const atualizada = await obterContaMesa(idconta);
	if (!atualizada) {
		throw new Error("Falha ao atualizar nome");
	}
	return atualizada;
}

export async function enviarPedidoConta(params: {
	idconta: string;
	clientOrderId: string;
	itens: Array<{
		idproduto: string;
		quantidade: number;
		observacao?: string | null;
		idprodutomeio?: string | null;
	}>;
}): Promise<
	ContaMesaLocal & {
		pedidoNovo: boolean;
		itensProducao: Array<{
			idproduto: string;
			descricao: string;
			quantidade: number;
			observacao?: string | null;
		}>;
	}
> {
	const clientOrderId = params.clientOrderId.trim();
	if (!clientOrderId) {
		throw new Error("Pedido sem identificador");
	}
	if (!params.itens.length) {
		throw new Error("Pedido sem itens");
	}
	const existente = await queryOne<{ id: string }>(
		"SELECT id FROM pedido_fila WHERE client_order_id = $1 LIMIT 1",
		[clientOrderId],
	);
	if (existente) {
		const conta = await obterContaMesa(params.idconta);
		if (!conta) {
			throw new Error("Conta inválida");
		}
		return { ...conta, pedidoNovo: false, itensProducao: [] };
	}

	const conta = await obterContaMesa(params.idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}

	const itensProducao: Array<{
		idproduto: string;
		descricao: string;
		quantidade: number;
		observacao?: string | null;
	}> = [];

	for (const linha of params.itens) {
		const produto = await buscarProdutoPorId(linha.idproduto);
		if (!produto) {
			throw new Error("Produto não encontrado no catálogo local");
		}
		const qtd = Number(linha.quantidade);
		if (!Number.isFinite(qtd) || qtd <= 0) {
			throw new Error("Quantidade inválida");
		}

		let idproduto = produto.id;
		let descricao = produto.descricao;
		let precounitario = produto.preco;
		let quantidade = qtd;

		const idMeio = linha.idprodutomeio?.trim();
		if (idMeio) {
			const segundo = await buscarProdutoPorId(idMeio);
			if (!segundo) {
				throw new Error("Segundo sabor não encontrado no catálogo local");
			}
			if (!produtoEhPizza(produto) || !produtoEhPizza(segundo)) {
				throw new Error("Meio a meio só é permitido entre produtos pizza");
			}
			if (produto.id === segundo.id) {
				throw new Error("Escolha dois sabores diferentes");
			}
			const montado = montarItemPizzaMeioAMeio(produto, segundo);
			idproduto = montado.idproduto;
			descricao = montado.descricao;
			precounitario = montado.precounitario;
			quantidade = 1;
		}

		await adicionarItemConta(params.idconta, {
			idproduto,
			descricao,
			quantidade,
			precounitario,
			observacao: linha.observacao,
		});
		const agora = new Date().toISOString();
		await execute(
			`INSERT INTO pedido_fila (
				id, client_order_id, idconta, numero_mesa, nomecliente,
				idproduto, descricao, quantidade, observacao, status, criadoem
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente', $10)`,
			[
				uuidv4(),
				clientOrderId,
				conta.id,
				conta.numero_mesa,
				conta.nomecliente,
				idproduto,
				descricao,
				quantidade,
				linha.observacao?.trim() || null,
				agora,
			],
		);
		itensProducao.push({
			idproduto,
			descricao,
			quantidade,
			observacao: linha.observacao,
		});
	}

	const atualizada = await obterContaMesa(params.idconta);
	if (!atualizada) {
		throw new Error("Falha ao enviar pedido");
	}
	return { ...atualizada, pedidoNovo: true, itensProducao };
}

export async function listarPedidosFila(
	pendentes: boolean,
): Promise<PedidoFilaLocal[]> {
	const inicioDia = new Date();
	inicioDia.setHours(0, 0, 0, 0);
	const since = inicioDia.toISOString();
	if (pendentes) {
		return query<PedidoFilaLocal>(
			`SELECT id, client_order_id, idconta, numero_mesa, nomecliente, idproduto,
				descricao, quantidade, observacao, status, criadoem, entregueem
			 FROM pedido_fila
			 WHERE criadoem >= $1 AND status = 'pendente'
			 ORDER BY criadoem`,
			[since],
		);
	}
	return query<PedidoFilaLocal>(
		`SELECT id, client_order_id, idconta, numero_mesa, nomecliente, idproduto,
			descricao, quantidade, observacao, status, criadoem, entregueem
		 FROM pedido_fila
		 WHERE criadoem >= $1
		 ORDER BY criadoem`,
		[since],
	);
}

export async function marcarPedidoEntregue(id: string): Promise<void> {
	const agora = new Date().toISOString();
	await execute(
		`UPDATE pedido_fila SET status = 'entregue', entregueem = $1
		 WHERE id = $2 AND status = 'pendente'`,
		[agora, id],
	);
}

export async function limparFilaPedidos(): Promise<void> {
	const agora = new Date().toISOString();
	await execute(
		`UPDATE pedido_fila SET status = 'entregue', entregueem = $1
		 WHERE status = 'pendente'`,
		[agora],
	);
}

export async function fecharContaMesa(params: {
	idconta: string;
	lancamentos: LancamentoPagamento[];
	troco?: number;
}): Promise<VendaLocal> {
	await recalcularContaPersistida(params.idconta);
	const conta = await obterContaMesa(params.idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	if (!conta.itens.length) {
		throw new Error("Conta sem itens");
	}
	if (!(await caixaAberto())) {
		throw new Error("Abra o caixa antes de receber");
	}
	const jaPagos = await listarPagamentosConta(conta.id);
	const restante = validarFechamentoPagamentos({
		total: conta.valorrestante,
		lancamentos: params.lancamentos,
		troco: params.troco,
	});
	return gravarVendaMesa({
		conta,
		itens: conta.itens,
		lancamentos: [...jaPagos, ...restante.efetivos],
		troco: restante.troco,
		total: conta.valortotal,
		valordesconto: conta.valordesconto,
		valortaxaservico: conta.valortaxaservico,
		valorcouvert: conta.valorcouvert,
		fecharConta: true,
		marcarItensIds: conta.itens.map((i) => i.id),
	});
}

async function gravarVendaMesa(params: {
	conta: ContaMesaLocal;
	itens: ContaMesaLocal["itens"];
	lancamentos: LancamentoPagamento[];
	troco?: number;
	total: number;
	valordesconto: number;
	valortaxaservico: number;
	valorcouvert: number;
	fecharConta: boolean;
	marcarItensIds: string[];
}): Promise<VendaLocal> {
	const sessao = await obterSessao();
	if (!sessao.idempresa) {
		throw new Error("Empresa não selecionada");
	}
	if (!(await caixaAberto())) {
		throw new Error("Abra o caixa antes de receber");
	}

	const idVenda = uuidv4();
	const agora = new Date().toISOString();
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	const fechamento = validarFechamentoPagamentos({
		total: params.total,
		lancamentos: params.lancamentos,
		troco: params.troco,
	});
	const sync = totaisParaSync(fechamento.efetivos, fechamento.troco);

	const venda = await withTransaction(async (client) => {
		await execute(
			`INSERT INTO venda (
				id, idempresa, numeropdv, origem, idconta, status, meio_pagamento,
				valortotal, valordinheiro, valorpix, valorcartao, valortroco,
				valordesconto, valortaxaservico, valorcouvert,
				criadoem, sync_status, nfce_status
			) VALUES ($1, $2, $3, 'mesa', $4, 'fechada', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pendente', 'pendente')`,
			[
				idVenda,
				sessao.idempresa,
				numeropdv,
				params.conta.id,
				fechamento.meio,
				params.total,
				sync.valordinheiro,
				sync.valorpix,
				sync.valorcartaocredito,
				fechamento.troco,
				params.valordesconto,
				params.valortaxaservico,
				params.valorcouvert,
				agora,
			],
			client,
		);

		for (const item of params.itens) {
			await execute(
				`INSERT INTO item_venda (id, idvenda, idproduto, descricao, quantidade, precounitario, precototal)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					uuidv4(),
					idVenda,
					item.idproduto,
					item.descricao,
					item.quantidade,
					item.precounitario,
					item.precototal,
				],
				client,
			);
		}

		await gravarLancamentosVenda(client, idVenda, fechamento.efetivos, agora);

		if (params.marcarItensIds.length) {
			await execute(
				`UPDATE item_conta SET pago = 1 WHERE id = ANY($1::text[])`,
				[params.marcarItensIds],
				client,
			);
		}

		if (params.fecharConta) {
			await execute(
				`DELETE FROM conta_pagamento WHERE idconta = $1`,
				[params.conta.id],
				client,
			);
			await execute(
				`UPDATE conta_mesa SET status = 'fechada', fechadoem = $1, sync_status = 'pendente' WHERE id = $2`,
				[agora, params.conta.id],
				client,
			);
			await execute(
				`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
				[params.conta.numero_mesa],
				client,
			);
		}

		const row = await queryOne<VendaLocal>(
			"SELECT * FROM venda WHERE id = $1",
			[idVenda],
			client,
		);
		if (!row) {
			throw new Error("Falha ao gravar venda da conta");
		}
		return row;
	});

	await enfileirarOutbox("criar_venda", {
		idlocal: idVenda,
		meio: fechamento.meio,
		pagamentos: fechamento.efetivos,
		valordinheiro: sync.valordinheiro,
		valorpix: sync.valorpix,
		valorcartao: sync.valorcartaocredito,
		itens: params.itens.map((i) => ({
			idproduto: i.idproduto,
			descricao: i.descricao,
			quantidade: i.quantidade,
			precounitario: i.precounitario,
			precototal: i.precototal,
		})),
		valortotal: params.total,
		valortroco: fechamento.troco,
		valordesconto: params.valordesconto,
		valortaxaservico: params.valortaxaservico,
		valorcouvert: params.valorcouvert,
		origem: "mesa",
		idconta_local: params.conta.id,
		numero_mesa: params.conta.numero_mesa,
	});

	return venda;
}

export async function aplicarAjustesConta(params: {
	idconta: string;
	numeropessoas?: number;
	taxaAtiva?: boolean;
	desconto?: number;
	senha?: string;
}): Promise<ContaMesaLocal> {
	const conta = await obterContaMesa(params.idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}

	let desconto = conta.valordesconto;
	if (params.desconto !== undefined) {
		const novo = arredondarMoeda(Math.max(0, Number(params.desconto) || 0));
		if (Math.abs(novo - conta.valordesconto) > 0.009) {
			await exigirSenhaGerencial(params.senha);
			desconto = novo;
		}
	}

	const numeropessoas =
		params.numeropessoas !== undefined
			? Math.max(1, Math.floor(Number(params.numeropessoas) || 1))
			: conta.numeropessoas;
	const taxaAtiva =
		params.taxaAtiva !== undefined
			? Boolean(params.taxaAtiva)
			: conta.taxa_ativa === 1;
	const pessoasMudou =
		params.numeropessoas !== undefined && numeropessoas !== conta.numeropessoas;
	const valorcouvert = pessoasMudou
		? arredondarMoeda(numeropessoas * (await couvertConfig()))
		: conta.valorcouvert;

	await execute(
		`UPDATE conta_mesa SET
			numeropessoas = $1,
			valordesconto = $2,
			valorcouvert = $3,
			taxa_ativa = $4,
			sync_status = 'pendente'
		 WHERE id = $5`,
		[numeropessoas, desconto, valorcouvert, taxaAtiva ? 1 : 0, params.idconta],
	);
	await recalcularContaPersistida(params.idconta);
	const atualizada = await obterContaMesa(params.idconta);
	if (!atualizada) {
		throw new Error("Falha ao atualizar a conta");
	}
	return atualizada;
}

export async function exigirSenhaGerencial(senha?: string): Promise<void> {
	const hash = await getConfig("senha_gerencial_hash", "");
	const salt = await getConfig("senha_gerencial_salt", "");
	if (!hash || !salt) {
		throw new Error("Defina a senha gerencial nas configurações do PDV");
	}
	const { senhaGerencialConfere } = await import("./senha-gerencial");
	if (!senha || !senhaGerencialConfere(senha, salt, hash)) {
		throw new Error("Senha gerencial inválida");
	}
}

export async function validarSenhaGerencial(senha: string): Promise<boolean> {
	try {
		await exigirSenhaGerencial(senha);
		return true;
	} catch {
		return false;
	}
}

export async function senhaGerencialDefinida(): Promise<boolean> {
	const hash = await getConfig("senha_gerencial_hash", "");
	return Boolean(hash);
}

export async function registrarPagamentoConta(params: {
	idconta: string;
	lancamentos: LancamentoPagamento[];
	troco?: number;
}): Promise<{ conta: ContaMesaLocal; venda: VendaLocal | null }> {
	await recalcularContaPersistida(params.idconta);
	const conta = await obterContaMesa(params.idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	if (!conta.itens.length) {
		throw new Error("Conta sem itens");
	}
	if (!(await caixaAberto())) {
		throw new Error("Abra o caixa antes de receber");
	}

	const restante = validarFechamentoPagamentos({
		total: conta.valorrestante,
		lancamentos: params.lancamentos,
		troco: params.troco,
	});

	if (conta.valorrestante - restante.soma <= 0.009) {
		const venda = await fecharContaMesa({
			idconta: params.idconta,
			lancamentos: params.lancamentos,
			troco: restante.troco,
		});
		return { conta: (await obterContaMesa(params.idconta)) ?? conta, venda };
	}

	const agora = new Date().toISOString();
	await withTransaction(async (client) => {
		for (const lanc of restante.efetivos) {
			await execute(
				`INSERT INTO conta_pagamento (
					id, idconta, meio, valor, nsu, autorizacao, bandeira, status, criadoem
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					lanc.id ?? uuidv4(),
					params.idconta,
					lanc.meio,
					lanc.valor,
					lanc.nsu ?? null,
					lanc.autorizacao ?? null,
					lanc.bandeira ?? null,
					lanc.status ?? "ok",
					agora,
				],
				client,
			);
		}
	});
	const atualizada = await obterContaMesa(params.idconta);
	if (!atualizada) {
		throw new Error("Falha ao registrar pagamento");
	}
	return { conta: atualizada, venda: null };
}

export async function fecharFatiaItens(params: {
	idconta: string;
	idsItens: string[];
	lancamentos: LancamentoPagamento[];
	troco?: number;
}): Promise<{ conta: ContaMesaLocal | null; venda: VendaLocal }> {
	await recalcularContaPersistida(params.idconta);
	const conta = await obterContaMesa(params.idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	const ids = new Set(params.idsItens);
	const itensFatia = conta.itens.filter((i) => ids.has(i.id));
	if (!itensFatia.length) {
		throw new Error("Selecione os itens desta fatia");
	}
	if (itensFatia.length !== ids.size) {
		throw new Error("Há item inválido na fatia");
	}

	const totaisConta: TotaisContaGourmet = {
		subtotal: conta.subtotal,
		valordesconto: conta.valordesconto,
		valortaxaservico: conta.valortaxaservico,
		valorcouvert: conta.valorcouvert,
		valortotal: conta.valortotal,
		numeropessoas: conta.numeropessoas,
	};
	const { partirPorItens } = await import("./conta-gourmet");
	const restoIds = conta.itens.filter((i) => !ids.has(i.id)).map((i) => i.id);
	const grupos = restoIds.length
		? [params.idsItens, restoIds]
		: [params.idsItens];
	const fatias = partirPorItens(
		conta.itens.map((i) => ({ id: i.id, precototal: i.precototal })),
		grupos,
		totaisConta,
	);
	const fatia = fatias[0];
	if (!fatia) {
		throw new Error("Não foi possível calcular a fatia");
	}

	const venda = await gravarVendaMesa({
		conta,
		itens: itensFatia,
		lancamentos: params.lancamentos,
		troco: params.troco,
		total: fatia.total,
		valordesconto: fatia.desconto,
		valortaxaservico: fatia.taxa,
		valorcouvert: fatia.couvert,
		fecharConta: restoIds.length === 0,
		marcarItensIds: params.idsItens,
	});

	if (restoIds.length === 0) {
		return { conta: null, venda };
	}

	const descontoRestante = arredondarMoeda(
		conta.valordesconto - fatia.desconto,
	);
	const couvertRestante = arredondarMoeda(conta.valorcouvert - fatia.couvert);
	await execute(
		`UPDATE conta_mesa SET valordesconto = $1, valorcouvert = $2, sync_status = 'pendente' WHERE id = $3`,
		[Math.max(0, descontoRestante), Math.max(0, couvertRestante), conta.id],
	);
	await recalcularContaPersistida(conta.id);
	return { conta: await obterContaMesa(conta.id), venda };
}

export async function transferirConta(
	idconta: string,
	numeroDestino: number,
): Promise<ContaMesaLocal> {
	const conta = await obterContaMesa(idconta);
	if (!conta || conta.status !== "aberta") {
		throw new Error("Conta inválida");
	}
	if (conta.numero_mesa === numeroDestino) {
		return conta;
	}
	const destino = await queryOne<{
		status: string;
		idconta: string | null;
	}>("SELECT status, idconta FROM mesa WHERE numero = $1", [numeroDestino]);
	if (!destino) {
		throw new Error("Mesa de destino não encontrada");
	}
	if (destino.status === "ocupada" && destino.idconta) {
		const destConta = await obterContaMesa(destino.idconta);
		if (destConta && destConta.itens.length > 0) {
			throw new Error("Destino já tem conta aberta. Use juntar mesas.");
		}
	}

	const origemNumero = conta.numero_mesa;
	await withTransaction(async (client) => {
		await execute(
			"UPDATE conta_mesa SET numero_mesa = $1, sync_status = 'pendente' WHERE id = $2",
			[numeroDestino, idconta],
			client,
		);
		await execute(
			`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
			[origemNumero],
			client,
		);
		await execute(
			`UPDATE mesa SET status = 'ocupada', idconta = $1, nomecliente = $2 WHERE numero = $3`,
			[idconta, conta.nomecliente, numeroDestino],
			client,
		);
		await execute(
			"UPDATE pedido_fila SET numero_mesa = $1 WHERE idconta = $2",
			[numeroDestino, idconta],
			client,
		);
	});
	const atualizada = await obterContaMesa(idconta);
	if (!atualizada) {
		throw new Error("Falha ao transferir a conta");
	}
	return atualizada;
}

export async function transferirItens(params: {
	idcontaOrigem: string;
	idsItens: string[];
	numeroDestino: number;
}): Promise<{ origem: ContaMesaLocal | null; destino: ContaMesaLocal }> {
	const origem = await obterContaMesa(params.idcontaOrigem);
	if (!origem || origem.status !== "aberta") {
		throw new Error("Conta de origem inválida");
	}
	const ids = new Set(params.idsItens);
	const mover = origem.itens.filter((i) => ids.has(i.id));
	if (!mover.length) {
		throw new Error("Selecione os itens para transferir");
	}

	let destino = await obterContaPorNumero(params.numeroDestino);
	if (!destino) {
		destino = await abrirContaMesa(
			params.numeroDestino,
			origem.nomecliente ?? undefined,
		);
	}

	await withTransaction(async (client) => {
		await execute(
			`UPDATE item_conta SET idconta = $1 WHERE id = ANY($2::text[])`,
			[destino.id, mover.map((i) => i.id)],
			client,
		);
		await recalcularContaPersistida(origem.id, client);
		await recalcularContaPersistida(destino.id, client);
	});

	const origemAtual = await obterContaMesa(origem.id);
	if (
		origemAtual &&
		origemAtual.itens.length === 0 &&
		origemAtual.valorpago <= 0
	) {
		await execute(
			`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
			[origem.numero_mesa],
		);
		await execute(
			`UPDATE conta_mesa SET status = 'fechada', fechadoem = $1 WHERE id = $2`,
			[new Date().toISOString(), origem.id],
		);
		return {
			origem: null,
			destino: (await obterContaMesa(destino.id)) as ContaMesaLocal,
		};
	}
	const destAtual = await obterContaMesa(destino.id);
	if (!destAtual) {
		throw new Error("Falha ao transferir itens");
	}
	return { origem: origemAtual, destino: destAtual };
}

export async function juntarContas(
	idOrigem: string,
	idDestino: string,
): Promise<ContaMesaLocal> {
	if (idOrigem === idDestino) {
		throw new Error("Escolha duas contas diferentes");
	}
	const origem = await obterContaMesa(idOrigem);
	const destino = await obterContaMesa(idDestino);
	if (!origem || origem.status !== "aberta") {
		throw new Error("Conta de origem inválida");
	}
	if (!destino || destino.status !== "aberta") {
		throw new Error("Conta de destino inválida");
	}

	await withTransaction(async (client) => {
		await execute(
			"UPDATE item_conta SET idconta = $1 WHERE idconta = $2 AND COALESCE(pago, 0) = 0",
			[idDestino, idOrigem],
			client,
		);
		await execute(
			"UPDATE pedido_fila SET idconta = $1, numero_mesa = $2 WHERE idconta = $3",
			[idDestino, destino.numero_mesa, idOrigem],
			client,
		);
		await execute(
			`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
			[origem.numero_mesa],
			client,
		);
		await execute(
			`UPDATE conta_mesa SET status = 'fechada', fechadoem = $1 WHERE id = $2`,
			[new Date().toISOString(), idOrigem],
			client,
		);
		await recalcularContaPersistida(idDestino, client);
	});

	const atualizada = await obterContaMesa(idDestino);
	if (!atualizada) {
		throw new Error("Falha ao juntar as contas");
	}
	return atualizada;
}

export async function salvarConfiguracoes(
	dados: Record<string, string>,
): Promise<Record<string, string>> {
	for (const [chave, valor] of Object.entries(dados)) {
		await setConfig(chave, valor);
	}
	if (dados.qtd_mesas) {
		await garantirMesas(Number(dados.qtd_mesas));
	}
	const result: Record<string, string> = {};
	for (const k of Object.keys(dados)) {
		result[k] = await getConfig(k);
	}
	return result;
}

export async function obterNumeracaoNfce(): Promise<{
	serie: number;
	proximo_numero: number;
	csc_id: string | null;
	csc_token: string | null;
	cnpj: string | null;
	uf: string | null;
	ambiente: number;
}> {
	const row = await queryOne<{
		serie: number;
		proximo_numero: number;
		csc_id: string | null;
		csc_token: string | null;
		cnpj: string | null;
		uf: string | null;
		ambiente: number;
	}>("SELECT * FROM numeracao_nfce WHERE id = 1");
	if (!row) {
		throw new Error("Numeração NFC-e não inicializada");
	}
	return row;
}

export async function atualizarNumeracaoNfce(dados: {
	serie?: number;
	proximo_numero?: number;
	csc_id?: string | null;
	csc_token?: string | null;
	cnpj?: string | null;
	uf?: string | null;
	ambiente?: number;
}): Promise<void> {
	const atual = await obterNumeracaoNfce();
	await execute(
		`UPDATE numeracao_nfce SET
			serie = $1, proximo_numero = $2, csc_id = $3, csc_token = $4,
			cnpj = $5, uf = $6, ambiente = $7, atualizadoem = $8
		 WHERE id = 1`,
		[
			dados.serie ?? atual.serie,
			dados.proximo_numero ?? atual.proximo_numero,
			dados.csc_id ?? atual.csc_id,
			dados.csc_token ?? atual.csc_token,
			dados.cnpj ?? atual.cnpj,
			dados.uf ?? atual.uf,
			dados.ambiente ?? atual.ambiente,
			new Date().toISOString(),
		],
	);
}

export async function reservarNumeroNfce(): Promise<{
	serie: number;
	numero: number;
}> {
	const atual = await obterNumeracaoNfce();
	const numero = atual.proximo_numero;
	await atualizarNumeracaoNfce({ proximo_numero: numero + 1 });
	return { serie: atual.serie, numero };
}

export async function avancarNumeracaoNfceAposEmissao(
	serie: number,
	numero: number,
): Promise<void> {
	if (
		!Number.isFinite(serie) ||
		serie < 1 ||
		!Number.isFinite(numero) ||
		numero < 1
	) {
		return;
	}

	const atual = await obterNumeracaoNfce();
	const proximo = numero + 1;
	if (atual.serie !== serie) {
		await atualizarNumeracaoNfce({
			serie,
			proximo_numero: Math.max(proximo, atual.proximo_numero),
		});
		return;
	}

	if (proximo > atual.proximo_numero) {
		await atualizarNumeracaoNfce({ proximo_numero: proximo });
	}
}

async function persistirXmlNfceEmDisco(params: {
	chave?: string | null;
	serie: number;
	numero: number;
	xml?: string | null;
}): Promise<void> {
	if (!params.xml?.trim()) {
		return;
	}
	try {
		await gravarXmlNfceArquivo({
			chave: params.chave,
			serie: params.serie,
			numero: params.numero,
			xml: params.xml,
		});
	} catch {
		// XML no disco é cópia auxiliar — o banco continua sendo a fonte
	}
}

export async function salvarNfceLocal(dados: {
	id: string;
	idvenda: string;
	serie: number;
	numero: number;
	chave?: string;
	tpemis: number;
	status: string;
	xml?: string;
	qrcode?: string;
	protocolo?: string;
	motivo_contingencia?: string;
	data_contingencia?: string;
	transmitida?: boolean;
}): Promise<void> {
	await execute(
		`INSERT INTO nfce_local (
			id, idvenda, serie, numero, chave, tpemis, status, xml, qrcode, protocolo,
			motivo_contingencia, data_contingencia, transmitida, criadoem
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		[
			dados.id,
			dados.idvenda,
			dados.serie,
			dados.numero,
			dados.chave ?? null,
			dados.tpemis,
			dados.status,
			dados.xml ?? null,
			dados.qrcode ?? null,
			dados.protocolo ?? null,
			dados.motivo_contingencia ?? null,
			dados.data_contingencia ?? null,
			dados.transmitida ? 1 : 0,
			new Date().toISOString(),
		],
	);
	await persistirXmlNfceEmDisco({
		chave: dados.chave,
		serie: dados.serie,
		numero: dados.numero,
		xml: dados.xml,
	});
	await atualizarVendaSync(dados.idvenda, {
		idnfce_local: dados.id,
		nfce_status: dados.status,
	});
}

export async function obterNfcePorVenda(idvenda: string): Promise<{
	id: string;
	chave: string | null;
	qrcode: string | null;
	status: string;
	tpemis: number;
	xml: string | null;
	serie: number;
	numero: number;
	motivo_contingencia: string | null;
} | null> {
	return (
		(await queryOne<{
			id: string;
			chave: string | null;
			qrcode: string | null;
			status: string;
			tpemis: number;
			xml: string | null;
			serie: number;
			numero: number;
			motivo_contingencia: string | null;
		}>(
			`SELECT id, chave, qrcode, status, tpemis, xml, serie, numero, motivo_contingencia
			 FROM nfce_local WHERE idvenda = $1 ORDER BY criadoem DESC LIMIT 1`,
			[idvenda],
		)) ?? null
	);
}

export async function atualizarNfceLocalCampos(
	id: string,
	dados: {
		xml?: string | null;
		chave?: string | null;
		qrcode?: string | null;
		protocolo?: string | null;
		serie?: number;
		numero?: number;
		status?: string;
		transmitida?: boolean;
	},
): Promise<void> {
	const atual = await queryOne<{
		xml: string | null;
		chave: string | null;
		qrcode: string | null;
		protocolo: string | null;
		serie: number;
		numero: number;
		status: string;
		transmitida: number;
	}>(
		`SELECT xml, chave, qrcode, protocolo, serie, numero, status, transmitida FROM nfce_local WHERE id = $1`,
		[id],
	);
	if (!atual) return;
	await execute(
		`UPDATE nfce_local SET xml = $1, chave = $2, qrcode = $3, protocolo = $4,
			serie = $5, numero = $6, status = $7, transmitida = $8 WHERE id = $9`,
		[
			dados.xml ?? atual.xml,
			dados.chave ?? atual.chave,
			dados.qrcode ?? atual.qrcode,
			dados.protocolo ?? atual.protocolo,
			dados.serie ?? atual.serie,
			dados.numero ?? atual.numero,
			dados.status ?? atual.status,
			dados.transmitida != null
				? dados.transmitida
					? 1
					: 0
				: atual.transmitida,
			id,
		],
	);
	await persistirXmlNfceEmDisco({
		chave: dados.chave ?? atual.chave,
		serie: dados.serie ?? atual.serie,
		numero: dados.numero ?? atual.numero,
		xml: dados.xml ?? atual.xml,
	});
}

export async function marcarNfceTransmitida(id: string): Promise<void> {
	await execute(
		`UPDATE nfce_local SET transmitida = 1, status = 'transmitida' WHERE id = $1`,
		[id],
	);
}
