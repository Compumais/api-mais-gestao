import { isAbsolute, relative, resolve } from "node:path";

export const IDS_GRUPOS_LIMPEZA = [
	"produtos",
	"pagar",
	"receber",
	"vendas",
	"fiscal",
	"compras",
	"ordens",
	"pessoas",
	"cadastros",
	"tudo",
] as const;

export type IdGrupoLimpeza = (typeof IDS_GRUPOS_LIMPEZA)[number];

export const FILTRO_PAGAR = "upper(btrim(tipo)) = 'P'";
export const FILTRO_RECEBER = "upper(btrim(tipo)) = 'R'";

const FILTROS_PERMITIDOS = new Set([FILTRO_PAGAR, FILTRO_RECEBER]);

/** Empresa, acesso, cobrança e catálogos globais ficam de fora mesmo em "tudo". */
export const TABELAS_PRESERVADAS = new Set([
	"empresas",
	"usuario_empresas",
	"usuarios",
	"audit_logs",
	"sessoes",
	"contas",
	"verificacoes",
	"assinaturas",
	"clientes_asaas",
	"usuario_modulos",
	"planos_saas",
	"modulos_saas",
	"features_saas",
	"plano_saas_features",
	"ajuda_posts",
	"informativos",
	"bancoimagemgrupo",
	"bancoimagemproduto",
	"bancoimagemcodigo",
]);

const BLOQUEIO_IMPLICITO: Record<string, string> = {
	produtos: "Produtos e estoque",
	entidade: "Clientes e fornecedores",
	financeiro: "Contas a pagar ou a receber",
	notafiscal: "Notas fiscais",
	dav: "Vendas e PDV",
	vendapdvgourmet: "Vendas e PDV",
	ordemservico: "Ordens de serviço",
	pedidocompra: "Compras",
	cotacaocompra: "Compras",
	contamesa: "Vendas e PDV",
	planocontas: "Limpar tudo",
	contacorrente: "Limpar tudo",
};

const TABELAS_POR_GRUPO: Record<
	Exclude<IdGrupoLimpeza, "tudo" | "pagar" | "receber">,
	string[]
> = {
	produtos: [
		"produtos",
		"produtoimagem",
		"produtofornecedor",
		"produto_ean",
		"produto_historico",
		"produto_kit_item",
		"produto_unidade_conversao",
		"saldoestoque",
		"movimentoestoque",
		"lote",
		"custoproduto",
		"fichaproducao",
		"fichaproducaoitem",
		"registroproducao",
		"registroproducaoitem",
		"tabela_preco",
		"tabela_preco_item",
		"atalhopdv",
	],
	vendas: [
		"vendapdvgourmet",
		"vendapdvitem",
		"vendapdvpagamento",
		"dav",
		"davitem",
		"davitemlote",
		"contamesa",
		"contamesaitem",
		"fechamentopdv",
		"pedidocardapiodelivery",
	],
	fiscal: [
		"notafiscal",
		"notafiscalitem",
		"notafiscalitemlote",
		"notafiscalxml",
		"nfeinbounddocumento",
		"inventariofiscal",
		"apuracao_efd_ajuste",
		"dominioenvio",
	],
	compras: [
		"pedidocompra",
		"pedidocompraitem",
		"cotacaocompra",
		"cotacaocompraitem",
		"cotacaocompraproposta",
		"cotacaocomprapropostaitem",
	],
	ordens: [
		"ordemservico",
		"ordemservicoitem",
		"ordemservicoitemlote",
		"ordemservicoevento",
		"ordemservicofaturamento",
	],
	pessoas: ["entidade", "entidadecontacontabil"],
	cadastros: [
		"hierarquia",
		"marca",
		"departamento",
		"grupogourmet",
		"centrocusto",
		"budget",
		"budget_centro_custo",
		"criterio_rateio",
		"criterio_rateio_linha",
		"localestoque",
		"localretirada",
		"condicaopagamento",
		"bandeiracartao",
		"motivobaixafinanceiro",
		"motiborebaixa",
		"tipoproblema",
		"prioridades",
		"area",
		"objeto",
		"tipocobranca",
		"terminalpdv",
		"configuracao_pdv",
		"cardapiodelivery",
		"tipoordemservicoevento",
	],
};

export class ErroPlanoLimpeza extends Error {
	constructor(mensagem: string) {
		super(mensagem);
		this.name = "ErroPlanoLimpeza";
	}
}

export type FkLimpeza = {
	childTable: string;
	childColumn: string;
	parentTable: string;
	parentColumn: string;
	deleteRule: string;
	childNullable: boolean;
};

export type AlvoLimpeza = {
	tabela: string;
	filtro?: string;
};

export type EscopoLimpeza =
	| {
			tipo: "empresa";
			tabela: string;
			coluna: string;
			filtro?: string;
	  }
	| {
			tipo: "ligacao";
			tabela: string;
			coluna: string;
			colunaFk: string;
			pai: EscopoLimpeza;
	  };

export type PassoLimpeza =
	| {
			tipo: "anular";
			tabela: string;
			coluna: string;
			escopo: EscopoLimpeza;
			restringirEmpresa: boolean;
	  }
	| {
			tipo: "anular-proprio";
			tabela: string;
			coluna: string;
			escopo: EscopoLimpeza;
	  }
	| {
			tipo: "apagar-referencia";
			tabela: string;
			coluna: string;
			escopo: EscopoLimpeza;
			restringirEmpresa: boolean;
	  }
	| {
			tipo: "apagar";
			tabela: string;
			filtro?: string;
	  };

export function grupoLimpezaValido(grupo: string): grupo is IdGrupoLimpeza {
	return (IDS_GRUPOS_LIMPEZA as readonly string[]).includes(grupo);
}

export function filtroLimpezaPermitido(filtro: string | undefined): boolean {
	return filtro === undefined || FILTROS_PERMITIDOS.has(filtro);
}

export function fksAuxiliaresLimpeza(grupos: readonly string[]): FkLimpeza[] {
	if (grupos.includes("tudo")) return [];
	if (!grupos.includes("pagar") && !grupos.includes("receber")) return [];
	return [
		{
			childTable: "apropriacao_centro_custo",
			childColumn: "origemid",
			parentTable: "financeiro",
			parentColumn: "id",
			deleteRule: "NO ACTION",
			childNullable: false,
		},
	];
}

export function resolverAlvosLimpeza(
	grupos: readonly string[],
	tabelasComEmpresa: Set<string>,
): AlvoLimpeza[] {
	const pedidos = grupos.includes("tudo") ? (["tudo"] as const) : grupos;
	if (pedidos.includes("tudo")) {
		return [...tabelasComEmpresa]
			.filter((tabela) => !TABELAS_PRESERVADAS.has(tabela))
			.sort()
			.map((tabela) => ({ tabela }));
	}

	const alvos: AlvoLimpeza[] = [];
	for (const grupo of pedidos) {
		if (!grupoLimpezaValido(grupo)) {
			throw new ErroPlanoLimpeza("Grupo de limpeza inválido.");
		}
		if (grupo === "pagar" || grupo === "receber") {
			if (tabelasComEmpresa.has("financeiro")) {
				alvos.push({
					tabela: "financeiro",
					filtro: grupo === "pagar" ? FILTRO_PAGAR : FILTRO_RECEBER,
				});
			}
			continue;
		}
		if (grupo === "tudo") continue;
		for (const tabela of TABELAS_POR_GRUPO[grupo]) {
			if (tabelasComEmpresa.has(tabela)) alvos.push({ tabela });
		}
	}
	return unirFinanceiroCompleto(deduplicarAlvos(alvos));
}

function unirFinanceiroCompleto(alvos: AlvoLimpeza[]): AlvoLimpeza[] {
	const filtros = new Set(
		alvos
			.filter((alvo) => alvo.tabela === "financeiro")
			.map((alvo) => alvo.filtro),
	);
	if (!filtros.has(FILTRO_PAGAR) || !filtros.has(FILTRO_RECEBER)) return alvos;
	return [
		...alvos.filter((alvo) => alvo.tabela !== "financeiro"),
		{ tabela: "financeiro" },
	];
}

function deduplicarAlvos(alvos: AlvoLimpeza[]): AlvoLimpeza[] {
	const porTabela = new Map<string, AlvoLimpeza[]>();
	for (const alvo of alvos) {
		const lista = porTabela.get(alvo.tabela) ?? [];
		lista.push(alvo);
		porTabela.set(alvo.tabela, lista);
	}
	const saida: AlvoLimpeza[] = [];
	for (const lista of porTabela.values()) {
		if (lista.some((alvo) => !alvo.filtro)) {
			saida.push({ tabela: lista[0]?.tabela ?? "" });
			continue;
		}
		const vistos = new Set<string>();
		for (const alvo of lista) {
			const chave = alvo.filtro ?? "";
			if (vistos.has(chave)) continue;
			vistos.add(chave);
			saida.push(alvo);
		}
	}
	return saida.filter((alvo) => alvo.tabela.length > 0);
}

export function montarPlanoLimpeza(params: {
	alvos: AlvoLimpeza[];
	fks: FkLimpeza[];
	chaves?: Record<string, string>;
	tabelasComEmpresa?: Set<string>;
}): PassoLimpeza[] {
	if (params.alvos.length === 0) {
		throw new ErroPlanoLimpeza(
			"Nenhuma tabela encontrada para os grupos escolhidos.",
		);
	}
	for (const alvo of params.alvos) {
		if (!filtroLimpezaPermitido(alvo.filtro)) {
			throw new ErroPlanoLimpeza("Filtro de limpeza inválido.");
		}
	}

	const chaves = params.chaves ?? {};
	const comEmpresa =
		params.tabelasComEmpresa ??
		new Set(params.alvos.map((alvo) => alvo.tabela));
	const tabelas = [...new Set(params.alvos.map((alvo) => alvo.tabela))];
	const alvoSet = new Set(tabelas);
	const ordem = ordenarAlvos(tabelas, params.fks);
	const passos: PassoLimpeza[] = [];

	for (const tabela of ordem) {
		const variantes = params.alvos.filter((alvo) => alvo.tabela === tabela);
		for (const variante of variantes) {
			const escopo: EscopoLimpeza = {
				tipo: "empresa",
				tabela,
				coluna: chaves[tabela] ?? "id",
				...(variante.filtro ? { filtro: variante.filtro } : {}),
			};
			passos.push(
				...anularAutoReferencias(tabela, escopo, params.fks),
				...liberarReferencias({
					tabela,
					escopo,
					alvoSet,
					fks: params.fks,
					chaves,
					comEmpresa,
					caminho: [],
				}),
				{
					tipo: "apagar",
					tabela,
					...(variante.filtro ? { filtro: variante.filtro } : {}),
				},
			);
		}
	}
	return passos;
}

function ordenarAlvos(tabelas: string[], fks: FkLimpeza[]): string[] {
	const conjunto = new Set(tabelas);
	const indegree = new Map(tabelas.map((tabela) => [tabela, 0]));
	const seguintes = new Map<string, string[]>(
		tabelas.map((tabela) => [tabela, []]),
	);
	const arestas = new Set<string>();
	for (const fk of fks) {
		if (fk.childTable === fk.parentTable) continue;
		if (!conjunto.has(fk.childTable) || !conjunto.has(fk.parentTable)) {
			continue;
		}
		const aresta = `${fk.childTable}->${fk.parentTable}`;
		if (arestas.has(aresta)) continue;
		arestas.add(aresta);
		seguintes.get(fk.childTable)?.push(fk.parentTable);
		indegree.set(fk.parentTable, (indegree.get(fk.parentTable) ?? 0) + 1);
	}

	const fila = tabelas.filter((tabela) => indegree.get(tabela) === 0);
	const ordem: string[] = [];
	while (fila.length > 0) {
		const atual = fila.shift();
		if (!atual) break;
		ordem.push(atual);
		for (const dependente of seguintes.get(atual) ?? []) {
			const restante = (indegree.get(dependente) ?? 1) - 1;
			indegree.set(dependente, restante);
			if (restante === 0) fila.push(dependente);
		}
	}
	if (ordem.length !== tabelas.length) {
		throw new ErroPlanoLimpeza(
			"Não foi possível ordenar a exclusão por causa de referências circulares.",
		);
	}
	return ordem;
}

function anularAutoReferencias(
	tabela: string,
	escopo: EscopoLimpeza,
	fks: FkLimpeza[],
): PassoLimpeza[] {
	const passos: PassoLimpeza[] = [];
	const colunas = new Set<string>();
	for (const fk of fks) {
		if (fk.childTable !== tabela || fk.parentTable !== tabela) continue;
		if (!fk.childNullable || fk.childColumn === escopo.coluna) continue;
		if (colunas.has(fk.childColumn)) continue;
		colunas.add(fk.childColumn);
		passos.push({
			tipo: "anular-proprio",
			tabela,
			coluna: fk.childColumn,
			escopo,
		});
	}
	return passos;
}

function liberarReferencias(params: {
	tabela: string;
	escopo: EscopoLimpeza;
	alvoSet: Set<string>;
	fks: FkLimpeza[];
	chaves: Record<string, string>;
	comEmpresa: Set<string>;
	caminho: string[];
}): PassoLimpeza[] {
	const passos: PassoLimpeza[] = [];
	const vistos = new Set<string>();
	for (const fk of params.fks) {
		if (fk.parentTable !== params.tabela || fk.childTable === params.tabela) {
			continue;
		}
		if (params.caminho.includes(fk.childTable)) continue;
		const chave = `${fk.childTable}.${fk.childColumn}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);

		const filhoEhAlvo = params.alvoSet.has(fk.childTable);
		if (
			!filhoEhAlvo &&
			(TABELAS_PRESERVADAS.has(fk.childTable) ||
				BLOQUEIO_IMPLICITO[fk.childTable])
		) {
			if (fk.deleteRule === "SET NULL" || fk.deleteRule === "SET DEFAULT") {
				if (fk.childNullable) {
					passos.push({
						tipo: "anular",
						tabela: fk.childTable,
						coluna: fk.childColumn,
						escopo: params.escopo,
						restringirEmpresa: params.comEmpresa.has(fk.childTable),
					});
				}
				continue;
			}
			const nome =
				BLOQUEIO_IMPLICITO[fk.childTable] ?? "dados que precisam permanecer";
			throw new ErroPlanoLimpeza(
				`Inclua "${nome}" na limpeza. Ainda há registros obrigatórios ligados a estes dados.`,
			);
		}

		if (
			(fk.deleteRule === "SET NULL" || fk.deleteRule === "SET DEFAULT") &&
			fk.childNullable
		) {
			passos.push({
				tipo: "anular",
				tabela: fk.childTable,
				coluna: fk.childColumn,
				escopo: params.escopo,
				restringirEmpresa: params.comEmpresa.has(fk.childTable),
			});
			continue;
		}

		const escopoFilho: EscopoLimpeza = {
			tipo: "ligacao",
			tabela: fk.childTable,
			coluna: params.chaves[fk.childTable] ?? "id",
			colunaFk: fk.childColumn,
			pai: params.escopo,
		};
		passos.push(
			...anularAutoReferencias(fk.childTable, escopoFilho, params.fks),
			...liberarReferencias({
				tabela: fk.childTable,
				escopo: escopoFilho,
				alvoSet: params.alvoSet,
				fks: params.fks,
				chaves: params.chaves,
				comEmpresa: params.comEmpresa,
				caminho: [...params.caminho, params.tabela],
			}),
			{
				tipo: "apagar-referencia",
				tabela: fk.childTable,
				coluna: fk.childColumn,
				escopo: params.escopo,
				restringirEmpresa: params.comEmpresa.has(fk.childTable),
			},
		);
	}
	return passos;
}

export function caminhoDentroDoDiretorio(
	diretorio: string,
	chave: string,
): string | null {
	if (!chave || chave.includes("\0") || chave.includes("\\")) return null;
	if (isAbsolute(chave)) return null;
	const base = resolve(diretorio);
	const destino = resolve(base, chave);
	const relativo = relative(base, destino);
	if (!relativo || relativo.startsWith("..") || isAbsolute(relativo)) {
		return null;
	}
	return destino;
}
