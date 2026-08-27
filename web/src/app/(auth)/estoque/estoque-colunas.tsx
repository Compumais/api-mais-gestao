import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { SaldoEstoqueGestao } from "@/services/estoque-gestao.service";

export const DIVERGENCIA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "com", label: "Com divergência" },
	{ value: "sem", label: "Sem divergência" },
];

export type FiltrosColunaEstoqueState = {
	codigoproduto: string;
	nomeproduto: string;
	divergencia: string;
	ncm: string;
	unidademedida: string;
};

export const filtrosColunaEstoqueVazios: FiltrosColunaEstoqueState = {
	codigoproduto: "",
	nomeproduto: "",
	divergencia: "",
	ncm: "",
	unidademedida: "",
};

export type CampoFiltroColunaEstoque = keyof FiltrosColunaEstoqueState;

export const COLUNA_PARA_CAMPO_FILTRO_ESTOQUE: Record<
	string,
	CampoFiltroColunaEstoque
> = {
	codigo: "codigoproduto",
	nome: "nomeproduto",
	divergencia: "divergencia",
	ncm: "ncm",
	unidademedida: "unidademedida",
};

export const COLUNA_PARA_ORDENAR_ESTOQUE: Record<string, string> = {
	codigo: "codigo",
	nome: "nome",
	quantidade: "quantidade",
	quantidadefiscal: "quantidadefiscal",
	divergencia: "divergencia",
	ncm: "ncm",
	unidademedida: "unidademedida",
};

export type ConfigFiltroColunaEstoque = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaEstoque = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaEstoque[] = [
	{ id: "select", label: "Seleção", visivelPadrao: true, enableHiding: false },
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Produto", visivelPadrao: true },
	{ id: "quantidade", label: "Operacional", visivelPadrao: true },
	{ id: "quantidadefiscal", label: "Fiscal", visivelPadrao: true },
	{ id: "divergencia", label: "Divergência", visivelPadrao: true },
	{ id: "ncm", label: "NCM", visivelPadrao: false },
	{ id: "unidademedida", label: "Unidade", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasEstoque(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export type OpcoesColunasEstoque = {
	filtros: FiltrosColunaEstoqueState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaEstoque>;
	renderSelectHeader: (table: {
		getIsAllPageRowsSelected: () => boolean;
		getIsSomePageRowsSelected: () => boolean;
		toggleAllPageRowsSelected: (value: boolean) => void;
	}) => ReactNode;
	renderSelectCell: (row: {
		getIsSelected: () => boolean;
		toggleSelected: (value: boolean) => void;
		original: SaldoEstoqueGestao;
	}) => ReactNode;
	renderAcoes: (saldo: SaldoEstoqueGestao) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasEstoque,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_ESTOQUE[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_ESTOQUE[def.id] ?? def.id;
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === ordenacaoCampo && opcoes.ordem
			? opcoes.ordem
			: false;

	return (
		<CabecalhoColunaTabela
			titulo={def.label}
			colunaId={def.id}
			ordenacao={ordenacao}
			onOrdenar={(direcao) => opcoes.onOrdenarColuna(ordenacaoCampo, direcao)}
			filtroAtivo={filtroAtivo}
			valorFiltro={valorFiltro}
			onFiltrar={(valor) => opcoes.onFiltrarColuna(def.id, valor)}
			tipoFiltro={configFiltro.tipo}
			opcoes={configFiltro.opcoes}
			placeholderFiltro={configFiltro.placeholder}
		/>
	);
}

export function criarColunasEstoque(
	opcoes: OpcoesColunasEstoque,
): ColumnDef<SaldoEstoqueGestao>[] {
	const colunas: ColumnDef<SaldoEstoqueGestao>[] = [];

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
					id: "codigo",
					accessorKey: "codigoproduto",
					header,
					meta,
					cell: ({ row }) => row.original.codigoproduto ?? "-",
				});
				break;
			case "nome":
				colunas.push({
					id: "nome",
					accessorKey: "nomeproduto",
					header,
					meta,
					cell: ({ row }) => (
						<div className="flex items-center gap-2">
							<span>{row.original.nomeproduto ?? "-"}</span>
							{!row.original.possuiSaldo && (
								<Badge variant="secondary" className="text-xs">
									Sem movimento
								</Badge>
							)}
						</div>
					),
				});
				break;
			case "quantidade":
				colunas.push({
					id: "quantidade",
					accessorKey: "quantidade",
					header,
					meta,
					cell: ({ row }) => formatarQuantidade(row.original.quantidade),
				});
				break;
			case "quantidadefiscal":
				colunas.push({
					id: "quantidadefiscal",
					accessorKey: "quantidadefiscal",
					header,
					meta,
					cell: ({ row }) => formatarQuantidade(row.original.quantidadefiscal),
				});
				break;
			case "divergencia":
				colunas.push({
					id: "divergencia",
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
			case "ncm":
				colunas.push({
					id: "ncm",
					accessorKey: "ncm",
					header,
					meta,
					cell: ({ row }) => row.original.ncm ?? "-",
				});
				break;
			case "unidademedida":
				colunas.push({
					id: "unidademedida",
					accessorKey: "unidademedida",
					header,
					meta,
					cell: ({ row }) => row.original.unidademedida ?? "-",
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
