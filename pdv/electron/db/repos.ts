import type { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import {
	montarItemPizzaMeioAMeio,
	produtoEhPizza,
} from "../util/pizza-meio-a-meio";
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

export type {
	LancamentoPagamento,
	MeioPagamento,
	StatusLancamentoPagamento,
} from "./pagamento";

export type SessaoLocal = {
	token: string | null;
	userid: string | null;
	username: string | null;
	idempresa: string | null;
	nomeempresa: string | null;
};

export type ProdutoLocal = {
	id: string;
	descricao: string;
	preco: number;
	unidademedida: string | null;
	idunidademedida: string | null;
	ean: string | null;
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
		`UPDATE sessao SET token = $1, userid = $2, username = $3, idempresa = $4, nomeempresa = $5, atualizadoem = $6 WHERE id = 1`,
		[
			next.token,
			next.userid,
			next.username,
			next.idempresa,
			next.nomeempresa,
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
	});
}

const PRODUTO_SELECT =
	"id, descricao, preco, unidademedida, idunidademedida, ean, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem";

export async function upsertProdutos(
	produtos: Array<{
		id: string;
		descricao: string;
		preco: number;
		unidademedida?: string | null;
		idunidademedida?: string | null;
		ean?: string | null;
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
				`INSERT INTO produto_cache (id, descricao, preco, unidademedida, idunidademedida, ean, idgrupo, idgrupogourmet, espizza, imagem, caminhoimagem, inativo, atualizadoem)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12)
				 ON CONFLICT (id) DO UPDATE SET
					descricao = excluded.descricao,
					preco = excluded.preco,
					unidademedida = excluded.unidademedida,
					idunidademedida = excluded.idunidademedida,
					ean = excluded.ean,
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
				AND (descricao LIKE $1 OR ean LIKE $2)
			 ORDER BY descricao LIMIT $3`,
			[`%${q}%`, `%${q}%`, limit],
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
		 WHERE inativo = 0 AND idgrupogourmet = $1 AND (descricao LIKE $2 OR ean LIKE $3)
		 ORDER BY descricao LIMIT $4`,
		[idgrupogourmet, `%${q}%`, `%${q}%`, limit],
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
	return query<ProdutoLocal>(
		`SELECT ${PRODUTO_SELECT}
		 FROM produto_cache
		 WHERE inativo = 0 AND (descricao LIKE $1 OR ean LIKE $2 OR id LIKE $3)
		 ORDER BY descricao LIMIT $4`,
		[`%${q}%`, `%${q}%`, `%${q}%`, limit],
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
		 WHERE inativo = 0 AND idgrupo = $1 AND (descricao LIKE $2 OR ean LIKE $3)
		 ORDER BY descricao LIMIT $4`,
		[idgrupo, `%${q}%`, `%${q}%`, limit],
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
		`SELECT p.id, p.descricao, p.preco, p.unidademedida, p.idunidademedida, p.ean, p.idgrupo, p.idgrupogourmet, p.espizza, p.imagem, p.caminhoimagem
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
} | null> {
	return (
		(await queryOne<{
			id: string;
			numeropdv: number;
			abertoem: string;
			valorabertura: number;
		}>(
			`SELECT id, numeropdv, abertoem, valorabertura FROM caixa_turno WHERE status = 'aberto' ORDER BY abertoem DESC LIMIT 1`,
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
	if (!sessao.idempresa) {
		throw new Error("Empresa não selecionada");
	}
	const id = uuidv4();
	const agora = new Date().toISOString();
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	await execute(
		`INSERT INTO caixa_turno (id, idempresa, numeropdv, abertoem, valorabertura, status, sync_status)
		 VALUES ($1, $2, $3, $4, $5, 'aberto', 'pendente')`,
		[id, sessao.idempresa, numeropdv, agora, valorabertura],
	);
	await enfileirarOutbox("abrir_caixa", {
		idlocal: id,
		idempresa: sessao.idempresa,
		numeropdv,
		valorabertura,
		abertoem: agora,
	});
	return { id, abertoem: agora, valorabertura };
}

export async function fecharCaixa(valorfechamento: number): Promise<void> {
	const caixa = await caixaAberto();
	if (!caixa) {
		throw new Error("Nenhum caixa aberto");
	}
	const agora = new Date().toISOString();
	await execute(
		`UPDATE caixa_turno SET status = 'fechado', fechadoem = $1, valorfechamento = $2, sync_status = 'pendente' WHERE id = $3`,
		[agora, valorfechamento, caixa.id],
	);
	await enfileirarOutbox("fechamento_caixa", {
		idlocal: caixa.id,
		valorfechamento,
		fechadoem: agora,
	});
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
		meio:
			fechamento.meio === "MISTO"
				? fechamento.efetivos[0]?.meio
				: fechamento.meio,
		pagamentos: fechamento.efetivos,
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
		   AND NOT EXISTS (SELECT 1 FROM item_conta i WHERE i.idconta = c.id)`,
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
				SELECT COUNT(*)::int FROM item_conta i WHERE i.idconta = m.idconta
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
		   AND EXISTS (SELECT 1 FROM item_conta i WHERE i.idconta = m.idconta)
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
			`INSERT INTO conta_mesa (id, numero_mesa, idempresa, status, nomecliente, abertoem, valortotal, sync_status)
			 VALUES ($1, $2, $3, 'aberta', $4, $5, 0, 'pendente')`,
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
	const conta = await queryOne<{
		id: string;
		numero_mesa: number;
		status: string;
		nomecliente: string | null;
		abertoem: string;
		valortotal: number;
	}>("SELECT * FROM conta_mesa WHERE id = $1", [id]);
	if (!conta) {
		return null;
	}
	const itens = await query<ContaMesaLocal["itens"][number]>(
		`SELECT id, idproduto, descricao, quantidade, precounitario, precototal, observacao
		 FROM item_conta WHERE idconta = $1 ORDER BY criadoem`,
		[id],
	);
	return { ...conta, itens };
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
			`UPDATE conta_mesa SET valortotal = valortotal + $1, sync_status = 'pendente' WHERE id = $2`,
			[precototal, idconta],
			client,
		);
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

	const sessao = await obterSessao();
	if (!sessao.idempresa) {
		throw new Error("Empresa não selecionada");
	}

	const idVenda = uuidv4();
	const agora = new Date().toISOString();
	const total = conta.valortotal;
	const numeropdv = Number(await getConfig("numeropdv", "1"));
	const fechamento = validarFechamentoPagamentos({
		total,
		lancamentos: params.lancamentos,
		troco: params.troco,
	});
	const sync = totaisParaSync(fechamento.efetivos, fechamento.troco);

	const venda = await withTransaction(async (client) => {
		await execute(
			`INSERT INTO venda (
				id, idempresa, numeropdv, origem, idconta, status, meio_pagamento,
				valortotal, valordinheiro, valorpix, valorcartao, valortroco,
				criadoem, sync_status, nfce_status
			) VALUES ($1, $2, $3, 'mesa', $4, 'fechada', $5, $6, $7, $8, $9, $10, $11, 'pendente', 'pendente')`,
			[
				idVenda,
				sessao.idempresa,
				numeropdv,
				conta.id,
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

		for (const item of conta.itens) {
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

		await execute(
			`UPDATE conta_mesa SET status = 'fechada', fechadoem = $1, sync_status = 'pendente' WHERE id = $2`,
			[agora, conta.id],
			client,
		);

		await execute(
			`UPDATE mesa SET status = 'livre', idconta = NULL, nomecliente = NULL WHERE numero = $1`,
			[conta.numero_mesa],
			client,
		);

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
		meio:
			fechamento.meio === "MISTO"
				? fechamento.efetivos[0]?.meio
				: fechamento.meio,
		pagamentos: fechamento.efetivos,
		itens: conta.itens.map((i) => ({
			idproduto: i.idproduto,
			descricao: i.descricao,
			quantidade: i.quantidade,
			precounitario: i.precounitario,
			precototal: i.precototal,
		})),
		valortotal: total,
		valortroco: fechamento.troco,
		origem: "mesa",
		idconta_local: conta.id,
		numero_mesa: conta.numero_mesa,
	});

	return venda;
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
	motivo_contingencia: string | null;
} | null> {
	return (
		(await queryOne<{
			id: string;
			chave: string | null;
			qrcode: string | null;
			status: string;
			tpemis: number;
			motivo_contingencia: string | null;
		}>(
			`SELECT id, chave, qrcode, status, tpemis, motivo_contingencia
			 FROM nfce_local WHERE idvenda = $1 ORDER BY criadoem DESC LIMIT 1`,
			[idvenda],
		)) ?? null
	);
}

export async function marcarNfceTransmitida(id: string): Promise<void> {
	await execute(
		`UPDATE nfce_local SET transmitida = 1, status = 'transmitida' WHERE id = $1`,
		[id],
	);
}
