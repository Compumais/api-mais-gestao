import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { HttpResponse } from "@/model/http-model.js";
import { executarComControleAcessoPrivilegiado } from "@/repositories/controle-acesso-contexto.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { popularDadosPadraoEmpresa } from "@/service/empresa/popular-dados-padrao-empresa.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import * as schema from "../../../drizzle/schema.js";
import {
	caminhoDentroDoDiretorio,
	ErroPlanoLimpeza,
	type EscopoLimpeza,
	type FkLimpeza,
	filtroLimpezaPermitido,
	fksAuxiliaresLimpeza,
	grupoLimpezaValido,
	montarPlanoLimpeza,
	type PassoLimpeza,
	resolverAlvosLimpeza,
} from "./limpar-base-plano.js";

type LimparBaseEmpresaParams = {
	idempresa: string;
	grupos: string[];
	confirmacao: string;
	idusuario: string;
};

export type LimpezaBaseResultado = {
	total: number;
	removidos: Array<{ tabela: string; quantidade: number }>;
	padroesRepostos: boolean;
	aviso?: string;
};

type CatalogoLimpeza = {
	tabelasComEmpresa: Set<string>;
	chaves: Record<string, string>;
	fks: FkLimpeza[];
};

const EXTENSOES_IMAGEM = [".jpg", ".png", ".webp"];

export async function limparBaseEmpresaService({
	idempresa,
	grupos,
	confirmacao,
	idusuario,
}: LimparBaseEmpresaParams): Promise<HttpResponse<LimpezaBaseResultado>> {
	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) return httpNaoEncontrado("Empresa não encontrada");

	const gruposUnicos = [...new Set(grupos)];
	if (
		gruposUnicos.length === 0 ||
		gruposUnicos.some((grupo) => !grupoLimpezaValido(grupo))
	) {
		return httpBadRequest("Escolha o que deve ser apagado.");
	}
	if (!confirmacaoConfere(empresa.nome, confirmacao)) {
		return httpBadRequest("Digite o nome da empresa para confirmar a limpeza.");
	}

	const gruposEfetivos = gruposUnicos.includes("tudo")
		? ["tudo"]
		: gruposUnicos;

	try {
		const limpeza = await executarComControleAcessoPrivilegiado(async (tx) => {
			const catalogo = await carregarCatalogo(tx);
			const alvos = resolverAlvosLimpeza(
				gruposEfetivos,
				catalogo.tabelasComEmpresa,
			);
			const fks = [
				...catalogo.fks,
				...fksAuxiliaresLimpeza(gruposEfetivos).filter((extra) =>
					catalogo.tabelasComEmpresa.has(extra.childTable),
				),
			];
			const passos = montarPlanoLimpeza({
				alvos,
				fks,
				chaves: catalogo.chaves,
				tabelasComEmpresa: catalogo.tabelasComEmpresa,
			});
			const arquivos = await coletarArquivos(
				tx,
				idempresa,
				new Set(alvos.map((alvo) => alvo.tabela)),
			);
			const porTabela = new Map<string, number>();
			for (const passo of passos) {
				const quantidade = await executarPasso(tx, passo, idempresa);
				if (passo.tipo === "apagar" || passo.tipo === "apagar-referencia") {
					porTabela.set(
						passo.tabela,
						(porTabela.get(passo.tabela) ?? 0) + quantidade,
					);
				}
			}
			const removidos = [...porTabela.entries()]
				.filter(([, quantidade]) => quantidade > 0)
				.map(([tabela, quantidade]) => ({ tabela, quantidade }))
				.sort((a, b) => b.quantidade - a.quantidade);
			const total = removidos.reduce((soma, item) => soma + item.quantidade, 0);
			await tx.insert(schema.auditLogs).values({
				id: randomUUID(),
				acao: "limpar_base_empresa",
				recurso: "empresa",
				idrecurso: idempresa,
				idusuario,
				idempresa,
				criadoem: new Date().toISOString(),
				metadados: {
					grupos: gruposEfetivos,
					total,
					removidos,
				},
			});
			return { arquivos, total, removidos };
		});

		await apagarArquivos(limpeza.arquivos);

		let padroesRepostos = false;
		let aviso: string | undefined;
		if (gruposEfetivos.includes("tudo")) {
			try {
				await popularDadosPadraoEmpresa(idempresa);
				padroesRepostos = true;
			} catch (erro) {
				console.error("Falha ao repor dados padrão depois da limpeza", erro);
				aviso =
					"Os registros foram apagados, mas os dados padrão não puderam ser recriados.";
			}
		}

		return httpOk({
			total: limpeza.total,
			removidos: limpeza.removidos,
			padroesRepostos,
			...(aviso ? { aviso } : {}),
		});
	} catch (erro) {
		if (erro instanceof ErroPlanoLimpeza) {
			return {
				success: false,
				status: 409,
				error: erro.message,
				code: "LIMPEZA_BLOQUEADA",
			};
		}
		const codigo = codigoPg(erro);
		if (codigo === "23503") {
			return {
				success: false,
				status: 409,
				error:
					"Ainda existe um vínculo que impede a limpeza. Inclua o módulo relacionado ou limpe tudo.",
				code: "LIMPEZA_BLOQUEADA",
			};
		}
		console.error("Falha ao limpar base da empresa", erro);
		return {
			success: false,
			status: 500,
			error: "Não foi possível limpar a base da empresa.",
			code: "INTERNAL_SERVER_ERROR",
		};
	}
}

function confirmacaoConfere(nome: string, confirmacao: string) {
	return (
		nome.trim().toLocaleLowerCase("pt-BR") ===
		confirmacao.trim().toLocaleLowerCase("pt-BR")
	);
}

type Transacao = Parameters<
	Parameters<typeof executarComControleAcessoPrivilegiado>[0]
>[0];

async function carregarCatalogo(tx: Transacao): Promise<CatalogoLimpeza> {
	const tabelas = await tx.execute(sql`
		SELECT c.table_name
		FROM information_schema.columns c
		JOIN information_schema.tables t
			ON t.table_schema = c.table_schema
			AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
			AND c.column_name = 'idempresa'
			AND t.table_type = 'BASE TABLE'
	`);
	const chavesResultado = await tx.execute(sql`
		SELECT kcu.table_name, kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.constraint_type = 'PRIMARY KEY'
			AND tc.table_schema = 'public'
			AND kcu.ordinal_position = 1
	`);
	const fksResultado = await tx.execute(sql`
		SELECT
			kcu.table_name AS child_table,
			kcu.column_name AS child_column,
			ccu.table_name AS parent_table,
			ccu.column_name AS parent_column,
			rc.delete_rule,
			col.is_nullable,
			kcu.constraint_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.referential_constraints rc
			ON rc.constraint_name = tc.constraint_name
			AND rc.constraint_schema = tc.table_schema
		JOIN information_schema.key_column_usage ccu
			ON ccu.constraint_name = rc.unique_constraint_name
			AND ccu.constraint_schema = rc.unique_constraint_schema
			AND ccu.ordinal_position = kcu.position_in_unique_constraint
		JOIN information_schema.columns col
			ON col.table_schema = kcu.table_schema
			AND col.table_name = kcu.table_name
			AND col.column_name = kcu.column_name
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
	`);

	const chaves: Record<string, string> = {};
	for (const linha of linhas(chavesResultado)) {
		const tabela = texto(linha.table_name);
		const coluna = texto(linha.column_name);
		if (tabela && coluna && !chaves[tabela]) chaves[tabela] = coluna;
	}

	const compostos = new Set<string>();
	const contagem = new Map<string, number>();
	for (const linha of linhas(fksResultado)) {
		const nome = texto(linha.constraint_name);
		if (!nome) continue;
		contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
	}
	for (const [nome, quantidade] of contagem) {
		if (quantidade > 1) compostos.add(nome);
	}

	const fks: FkLimpeza[] = [];
	for (const linha of linhas(fksResultado)) {
		const constraint = texto(linha.constraint_name);
		if (constraint && compostos.has(constraint)) continue;
		const childTable = texto(linha.child_table);
		const childColumn = texto(linha.child_column);
		const parentTable = texto(linha.parent_table);
		const parentColumn = texto(linha.parent_column);
		const deleteRule = texto(linha.delete_rule);
		if (
			!childTable ||
			!childColumn ||
			!parentTable ||
			!parentColumn ||
			!deleteRule
		) {
			continue;
		}
		fks.push({
			childTable,
			childColumn,
			parentTable,
			parentColumn,
			deleteRule,
			childNullable: texto(linha.is_nullable) === "YES",
		});
	}

	return {
		tabelasComEmpresa: new Set(
			linhas(tabelas)
				.map((linha) => texto(linha.table_name))
				.filter((tabela): tabela is string => Boolean(tabela)),
		),
		chaves,
		fks,
	};
}

async function executarPasso(
	tx: Transacao,
	passo: PassoLimpeza,
	idempresa: string,
) {
	if (passo.tipo === "apagar") {
		if (!filtroLimpezaPermitido(passo.filtro)) {
			throw new ErroPlanoLimpeza("Filtro de limpeza inválido.");
		}
		const resultado = await tx.execute(sql`
			DELETE FROM ${ident(passo.tabela)}
			WHERE idempresa = ${idempresa}${clausulaFiltro(passo.filtro)}
		`);
		return quantidade(resultado);
	}
	if (passo.tipo === "anular-proprio") {
		const resultado = await tx.execute(sql`
			UPDATE ${ident(passo.tabela)}
			SET ${ident(passo.coluna)} = NULL
			WHERE ${ident(passo.escopo.coluna)} IN (${selectEscopo(passo.escopo, idempresa)})
		`);
		return quantidade(resultado);
	}
	const restricao = passo.restringirEmpresa
		? sql` AND idempresa = ${idempresa}`
		: sql``;
	if (passo.tipo === "anular") {
		const resultado = await tx.execute(sql`
			UPDATE ${ident(passo.tabela)}
			SET ${ident(passo.coluna)} = NULL
			WHERE ${ident(passo.coluna)} IN (${selectEscopo(passo.escopo, idempresa)})
			${restricao}
		`);
		return quantidade(resultado);
	}
	const resultado = await tx.execute(sql`
		DELETE FROM ${ident(passo.tabela)}
		WHERE ${ident(passo.coluna)} IN (${selectEscopo(passo.escopo, idempresa)})
		${restricao}
	`);
	return quantidade(resultado);
}

function selectEscopo(
	escopo: EscopoLimpeza,
	idempresa: string,
): ReturnType<typeof sql> {
	if (escopo.tipo === "empresa") {
		if (!filtroLimpezaPermitido(escopo.filtro)) {
			throw new ErroPlanoLimpeza("Filtro de limpeza inválido.");
		}
		return sql`SELECT ${ident(escopo.coluna)} FROM ${ident(escopo.tabela)} WHERE idempresa = ${idempresa}${clausulaFiltro(escopo.filtro)}`;
	}
	return sql`SELECT ${ident(escopo.coluna)} FROM ${ident(escopo.tabela)} WHERE ${ident(escopo.colunaFk)} IN (${selectEscopo(escopo.pai, idempresa)})`;
}

function clausulaFiltro(filtro?: string) {
	if (!filtro) return sql``;
	return sql.raw(` AND ${filtro}`);
}

function ident(nome: string) {
	if (!/^[a-z_][a-z0-9_]*$/.test(nome)) {
		throw new ErroPlanoLimpeza("Identificador de limpeza inválido.");
	}
	return sql.raw(`"${nome}"`);
}

async function coletarArquivos(
	tx: Transacao,
	idempresa: string,
	tabelas: Set<string>,
) {
	const arquivos: string[] = [];
	if (tabelas.has("produtoimagem")) {
		const diretorio =
			process.env.PRODUTO_IMAGENS_PATH?.trim() ||
			join(process.cwd(), "storage", "produtos");
		const resultado = await tx.execute(sql`
			SELECT chavearmazenamento
			FROM produtoimagem
			WHERE idempresa = ${idempresa}
				AND chavearmazenamento IS NOT NULL
		`);
		for (const linha of linhas(resultado)) {
			const chave = texto(linha.chavearmazenamento);
			if (!chave) continue;
			const caminho = caminhoDentroDoDiretorio(diretorio, chave);
			if (caminho) arquivos.push(caminho);
		}
	}
	if (tabelas.has("grupogourmet")) {
		const diretorio =
			process.env.GRUPO_GOURMET_IMAGENS_PATH?.trim() ||
			join(process.cwd(), "storage", "grupos-gourmet");
		const resultado = await tx.execute(sql`
			SELECT id, caminhoimagem
			FROM grupogourmet
			WHERE idempresa = ${idempresa}
				AND caminhoimagem IS NOT NULL
		`);
		for (const linha of linhas(resultado)) {
			const id = texto(linha.id);
			const token = tokenGrupo(texto(linha.caminhoimagem));
			if (!id || !token || !/^[0-9a-f-]{36}$/i.test(id)) continue;
			for (const extensao of EXTENSOES_IMAGEM) {
				const caminho = caminhoDentroDoDiretorio(
					diretorio,
					`${id}-${token}${extensao}`,
				);
				if (caminho) arquivos.push(caminho);
			}
		}
	}
	return arquivos;
}

function tokenGrupo(referencia: string | null) {
	if (!referencia?.startsWith("/grupos-gourmet/")) return null;
	try {
		const token = new URL(referencia, "http://local").searchParams.get("v");
		if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
		return token;
	} catch {
		return null;
	}
}

async function apagarArquivos(arquivos: string[]) {
	await Promise.all(
		arquivos.map(async (arquivo) => {
			await rm(arquivo, { force: true }).catch((erro: unknown) => {
				console.error("Falha ao remover arquivo da base limpa", arquivo, erro);
			});
		}),
	);
}

function linhas(resultado: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(resultado)) {
		return resultado.filter(registro);
	}
	if (resultado && typeof resultado === "object" && "rows" in resultado) {
		const rows = (resultado as { rows: unknown }).rows;
		if (Array.isArray(rows)) return rows.filter(registro);
	}
	return [];
}

function registro(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown) {
	return typeof valor === "string" && valor.length > 0 ? valor : null;
}

function quantidade(resultado: unknown) {
	if (resultado && typeof resultado === "object" && "rowCount" in resultado) {
		const rowCount = (resultado as { rowCount: unknown }).rowCount;
		if (typeof rowCount === "number" && rowCount > 0) return rowCount;
	}
	return 0;
}

function codigoPg(erro: unknown): string | undefined {
	if (!erro || typeof erro !== "object") return undefined;
	const codigo = (erro as { code?: unknown }).code;
	if (typeof codigo === "string") return codigo;
	return codigoPg((erro as { cause?: unknown }).cause);
}
