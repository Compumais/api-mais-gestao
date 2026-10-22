import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ProdutoImagemMiniatura } from "@/app/(auth)/produtos/components/produto-imagem-miniatura";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import { formatDataCivilBrasilia } from "@/lib/date";
import type { Produto } from "@/services/produtos.service";

export const DIVERGENCIA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "com", label: "Com divergência" },
	{ value: "sem", label: "Sem divergência" },
];

export type FiltrosColunaProdutosState = Record<string, string>;

export type MetaColunaProduto = {
	id: string;
	label: string;
	origem: "banco" | "calculada";
	visivelPadrao: boolean;
	filtravel: boolean;
	ordenavel: boolean;
	tipoFiltro?: "texto" | "boolean" | "data" | "divergencia";
};

export function criarFiltrosColunaProdutosVazios(
	ids: string[],
): FiltrosColunaProdutosState {
	return Object.fromEntries(ids.map((id) => [id, ""]));
}

/** @deprecated use criarFiltrosColunaProdutosVazios após carregar meta-colunas */
export const filtrosColunaProdutosVazios: FiltrosColunaProdutosState = {};

export function campoFiltroColunaProduto(colunaId: string): string | undefined {
	if (colunaId === "select" || colunaId === "imagem" || colunaId === "acoes") {
		return undefined;
	}
	return colunaId;
}

export type ConfigFiltroColunaProduto = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaProduto = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
	filtravel?: boolean;
};

const ORDEM_COLUNAS_FIXAS = [
	"select",
	"codigo",
	"nome",
	"imagem",
	"preco",
	"inativo",
	"quantidade",
	"quantidadefiscal",
	"divergencia",
] as const;

const ROTULOS_FIXOS: Record<string, string> = {
	select: "Seleção",
	imagem: "Imagem",
	acoes: "Ações",
	inativo: "Situação",
};

export function montarDefinicoesColunasProdutos(
	metaColunas: MetaColunaProduto[],
): DefinicaoColunaProduto[] {
	const metaPorId = new Map(metaColunas.map((c) => [c.id, c]));
	const usados = new Set<string>();
	const defs: DefinicaoColunaProduto[] = [];

	const push = (def: DefinicaoColunaProduto) => {
		if (usados.has(def.id)) return;
		usados.add(def.id);
		defs.push(def);
	};

	for (const id of ORDEM_COLUNAS_FIXAS) {
		if (id === "select" || id === "imagem") {
			push({
				id,
				label: ROTULOS_FIXOS[id] ?? id,
				visivelPadrao: true,
				enableHiding: false,
				filtravel: false,
			});
			continue;
		}
		const meta = metaPorId.get(id);
		push({
			id,
			label: meta?.label ?? ROTULOS_FIXOS[id] ?? id,
			visivelPadrao: meta?.visivelPadrao ?? true,
			filtravel: meta?.filtravel ?? true,
		});
	}

	for (const meta of metaColunas) {
		if (usados.has(meta.id)) continue;
		push({
			id: meta.id,
			label: meta.label,
			visivelPadrao: meta.visivelPadrao,
			filtravel: meta.filtravel,
		});
	}

	push({
		id: "acoes",
		label: ROTULOS_FIXOS.acoes,
		visivelPadrao: true,
		enableHiding: false,
		filtravel: false,
	});

	return defs;
}

export function listarDefinicoesColunasProdutos(
	metaColunas: MetaColunaProduto[],
) {
	return montarDefinicoesColunasProdutos(metaColunas).map(
		({ id, label, visivelPadrao, enableHiding }) => ({
			id,
			label,
			visivelPadrao,
			enableHiding: enableHiding !== false,
		}),
	);
}

export function visibilidadePadraoColunasProdutos(
	metaColunas: MetaColunaProduto[],
): VisibilityState {
	const state: VisibilityState = {};
	for (const def of montarDefinicoesColunasProdutos(metaColunas)) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export function idsColunasFiltravelProdutos(
	metaColunas: MetaColunaProduto[],
): string[] {
	return montarDefinicoesColunasProdutos(metaColunas)
		.filter((d) => d.filtravel !== false && d.id !== "acoes")
		.map((d) => d.id);
}

function formatarValorColunaGenerica(
	produto: Produto,
	campo: string,
	tipoFiltro?: MetaColunaProduto["tipoFiltro"],
): ReactNode {
	const bruto = (produto as unknown as Record<string, unknown>)[campo];
	if (bruto == null || bruto === "") return "-";

	if (campo === "datacadastro" && typeof bruto === "string") {
		return formatDataCivilBrasilia(bruto);
	}
	if (campo === "preco" || campo === "custoaquisicao") {
		return formatarPreco(String(bruto));
	}
	if (tipoFiltro === "boolean" && ehValorBooleanoColuna(bruto)) {
		const marcado = Number(bruto) === 1;
		if (campo === "inativo") {
			return (
				<span
					className={
						marcado
							? "text-muted-foreground"
							: "text-green-600 dark:text-green-400"
					}
				>
					{marcado ? "Inativo" : "Ativo"}
				</span>
			);
		}
		return marcado ? "Sim" : "Não";
	}
	if (
		campo === "quantidade" ||
		campo === "quantidadefiscal" ||
		campo === "divergencia"
	) {
		return formatarQuantidade(String(bruto));
	}

	return String(bruto);
}

function formatarPreco(preco: string | null | undefined) {
	if (!preco) return "-";
	const numero = Number.parseFloat(preco);
	if (Number.isNaN(numero)) return "-";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

function ehValorBooleanoColuna(valor: unknown) {
	return valor === 0 || valor === 1 || valor === "0" || valor === "1";
}

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function formatarDataCadastro(valor: string | null | undefined) {
	if (!valor) return "-";
	return formatDataCivilBrasilia(valor);
}

export type OpcoesColunasProdutos = {
	metaColunas: MetaColunaProduto[];
	filtros: FiltrosColunaProdutosState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaProduto>;
	renderSelectHeader: (table: {
		getIsAllPageRowsSelected: () => boolean;
		getIsSomePageRowsSelected: () => boolean;
		toggleAllPageRowsSelected: (value: boolean) => void;
	}) => ReactNode;
	renderSelectCell: (row: {
		getIsSelected: () => boolean;
		toggleSelected: (value: boolean) => void;
		original: Produto;
	}) => ReactNode;
	renderAcoes: (produto: Produto) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasProdutos,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = campoFiltroColunaProduto(def.id);
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === def.id && opcoes.ordem ? opcoes.ordem : false;

	return (
		<CabecalhoColunaTabela
			titulo={def.label}
			colunaId={def.id}
			ordenacao={ordenacao}
			onOrdenar={(direcao) => opcoes.onOrdenarColuna(def.id, direcao)}
			filtroAtivo={filtroAtivo}
			valorFiltro={valorFiltro}
			onFiltrar={(valor) => opcoes.onFiltrarColuna(def.id, valor)}
			tipoFiltro={configFiltro.tipo}
			opcoes={configFiltro.opcoes}
			placeholderFiltro={configFiltro.placeholder}
		/>
	);
}

export function criarColunasProdutos(
	opcoes: OpcoesColunasProdutos,
): ColumnDef<Produto>[] {
	const colunas: ColumnDef<Produto>[] = [];
	const definicoes = montarDefinicoesColunasProdutos(opcoes.metaColunas);
	const metaPorId = new Map(opcoes.metaColunas.map((c) => [c.id, c]));

	for (const def of definicoes) {
		const meta = { label: def.label };

		if (def.id === "select") {
			colunas.push({
				id: "select",
				header: ({ table }) => opcoes.renderSelectHeader(table),
				cell: ({ row }) => opcoes.renderSelectCell(row),
				enableSorting: false,
				enableHiding: false,
				meta,
			});
			continue;
		}

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				cell: ({ row }) => opcoes.renderAcoes(row.original),
				meta,
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "codigo":
				colunas.push({
					accessorKey: "codigo",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.codigo ?? "-"}</div>,
				});
				break;
			case "nome":
				colunas.push({
					accessorKey: "nome",
					header,
					meta,
					cell: ({ row }) => (
						<div className="flex flex-wrap items-center gap-2">
							<span>{row.original.nome}</span>
							{row.original.nomepai ? (
								<Badge variant="outline" className="text-xs">
									Variação de {row.original.nomepai}
								</Badge>
							) : null}
							{row.original.possuiSaldo === false && (
								<Badge variant="secondary" className="text-xs">
									Sem movimento
								</Badge>
							)}
						</div>
					),
				});
				break;
			case "imagem":
				colunas.push({
					id: "imagem",
					header: "Imagem",
					meta,
					enableSorting: false,
					cell: ({ row }) => (
						<ProdutoImagemMiniatura
							produtoId={row.original.id}
							nomeProduto={row.original.nome}
							referencia={row.original.caminhoimagem}
							imagemLegada={row.original.imagem}
						/>
					),
				});
				break;
			case "preco":
				colunas.push({
					accessorKey: "preco",
					header,
					meta,
					cell: ({ row }) => <div>{formatarPreco(row.original.preco)}</div>,
				});
				break;
			case "inativo":
				colunas.push({
					accessorKey: "inativo",
					header,
					meta,
					cell: ({ row }) => {
						const inativo = row.original.inativo === 1;
						return (
							<span
								className={
									inativo
										? "text-muted-foreground"
										: "text-green-600 dark:text-green-400"
								}
							>
								{inativo ? "Inativo" : "Ativo"}
							</span>
						);
					},
				});
				break;
			case "quantidade":
				colunas.push({
					accessorKey: "quantidade",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarQuantidade(row.original.quantidade)}</div>
					),
				});
				break;
			case "quantidadefiscal":
				colunas.push({
					accessorKey: "quantidadefiscal",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarQuantidade(row.original.quantidadefiscal)}</div>
					),
				});
				break;
			case "divergencia":
				colunas.push({
					accessorKey: "divergencia",
					header,
					meta,
					cell: ({ row }) => {
						const div = Number.parseFloat(row.original.divergencia ?? "0");
						const destacar = !Number.isNaN(div) && div !== 0;
						return (
							<span className={destacar ? "font-medium text-amber-600" : ""}>
								{formatarQuantidade(row.original.divergencia)}
							</span>
						);
					},
				});
				break;
			case "ean":
				colunas.push({
					accessorKey: "ean",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.ean ?? "-"}</div>,
				});
				break;
			case "referencia":
				colunas.push({
					accessorKey: "referencia",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.referencia ?? "-"}</div>,
				});
				break;
			case "ncm":
				colunas.push({
					accessorKey: "ncm",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.ncm ?? "-"}</div>,
				});
				break;
			case "unidademedida":
				colunas.push({
					id: "unidademedida",
					accessorFn: (row) => row.unidademedida,
					header,
					meta,
					cell: ({ row }) => <div>{row.original.unidademedida ?? "-"}</div>,
				});
				break;
			case "tipoproduto":
				colunas.push({
					accessorKey: "tipoproduto",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.tipoproduto ?? "-"}</div>,
				});
				break;
			case "fornecedor":
				colunas.push({
					accessorKey: "fornecedor",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.fornecedor ?? "-"}</div>,
				});
				break;
			case "custoaquisicao":
				colunas.push({
					accessorKey: "custoaquisicao",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarPreco(row.original.custoaquisicao)}</div>
					),
				});
				break;
			case "datacadastro":
				colunas.push({
					accessorKey: "datacadastro",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarDataCadastro(row.original.datacadastro)}</div>
					),
				});
				break;
			default:
				colunas.push({
					id: def.id,
					accessorFn: (row) =>
						(row as unknown as Record<string, unknown>)[def.id] ?? null,
					header: def.filtravel === false ? def.label : header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-xs truncate">
							{formatarValorColunaGenerica(
								row.original,
								def.id,
								metaPorId.get(def.id)?.tipoFiltro,
							)}
						</div>
					),
				});
				break;
		}
	}

	return colunas;
}

export function montarConfigFiltroColunasProdutos(
	metaColunas: MetaColunaProduto[],
): Record<string, ConfigFiltroColunaProduto> {
	const texto = (placeholder?: string): ConfigFiltroColunaProduto => ({
		tipo: "texto",
		placeholder,
	});
	const config: Record<string, ConfigFiltroColunaProduto> = {};

	const opcoesBoolean = (ativoInativo: boolean): ConfigFiltroColunaProduto => ({
		tipo: "opcoes",
		opcoes: ativoInativo
			? [
					{ value: "0", label: "Ativo" },
					{ value: "1", label: "Inativo" },
				]
			: [
					{ value: "0", label: "Não" },
					{ value: "1", label: "Sim" },
				],
	});

	for (const col of metaColunas) {
		if (!col.filtravel) continue;
		const tipo = col.tipoFiltro ?? "texto";
		if (tipo === "boolean") {
			config[col.id] = opcoesBoolean(col.id === "inativo");
			continue;
		}
		if (tipo === "data") {
			config[col.id] = { tipo: "data" };
			continue;
		}
		if (tipo === "divergencia") {
			config[col.id] = {
				tipo: "opcoes",
				opcoes: DIVERGENCIA_OPCOES_FILTRO,
			};
			continue;
		}
		config[col.id] = texto();
	}

	return config;
}
