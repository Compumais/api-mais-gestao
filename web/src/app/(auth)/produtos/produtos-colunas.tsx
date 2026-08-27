import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import type { Produto } from "@/services/produtos.service";

export type FiltrosColunaProdutosState = {
	codigo: string;
	nome: string;
	preco: string;
	inativo: string;
	ean: string;
	referencia: string;
	ncm: string;
	unidademedida: string;
	tipoproduto: string;
	fornecedor: string;
	custoaquisicao: string;
	datacadastro: string;
};

export const filtrosColunaProdutosVazios: FiltrosColunaProdutosState = {
	codigo: "",
	nome: "",
	preco: "",
	inativo: "",
	ean: "",
	referencia: "",
	ncm: "",
	unidademedida: "",
	tipoproduto: "",
	fornecedor: "",
	custoaquisicao: "",
	datacadastro: "",
};

export type CampoFiltroColunaProdutos = keyof FiltrosColunaProdutosState;

export const COLUNA_PARA_CAMPO_FILTRO_PRODUTO: Record<
	string,
	CampoFiltroColunaProdutos
> = {
	codigo: "codigo",
	nome: "nome",
	preco: "preco",
	inativo: "inativo",
	ean: "ean",
	referencia: "referencia",
	ncm: "ncm",
	unidademedida: "unidademedida",
	tipoproduto: "tipoproduto",
	fornecedor: "fornecedor",
	custoaquisicao: "custoaquisicao",
	datacadastro: "datacadastro",
};

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
};

const DEFINICOES_COLUNAS: DefinicaoColunaProduto[] = [
	{ id: "select", label: "Seleção", visivelPadrao: true, enableHiding: false },
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "preco", label: "Preço", visivelPadrao: true },
	{ id: "inativo", label: "Situação", visivelPadrao: true },
	{ id: "ean", label: "EAN", visivelPadrao: false },
	{ id: "referencia", label: "Referência", visivelPadrao: false },
	{ id: "ncm", label: "NCM", visivelPadrao: false },
	{ id: "unidademedida", label: "Unidade", visivelPadrao: false },
	{ id: "tipoproduto", label: "Tipo", visivelPadrao: false },
	{ id: "fornecedor", label: "Fornecedor", visivelPadrao: false },
	{ id: "custoaquisicao", label: "Custo", visivelPadrao: false },
	{ id: "datacadastro", label: "Data cadastro", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function listarDefinicoesColunasProdutos() {
	return DEFINICOES_COLUNAS.map(
		({ id, label, visivelPadrao, enableHiding }) => ({
			id,
			label,
			visivelPadrao,
			enableHiding: enableHiding !== false,
		}),
	);
}

export function visibilidadePadraoColunasProdutos(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
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

function formatarDataCadastro(valor: string | null | undefined) {
	if (!valor) return "-";
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return new Intl.DateTimeFormat("pt-BR").format(data);
}

export type OpcoesColunasProdutos = {
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
	const campo = COLUNA_PARA_CAMPO_FILTRO_PRODUTO[def.id];
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

	for (const def of DEFINICOES_COLUNAS) {
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
					cell: ({ row }) => <div>{row.original.nome}</div>,
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
				break;
		}
	}

	return colunas;
}
