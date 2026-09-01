import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { formatDateOnlyDisplay } from "@/lib/date";
import type { ContaCorrenteLancamento } from "@/services/conta-corrente-lancamento.service";

export const SENTIDO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "entrada", label: "Entrada" },
	{ value: "saida", label: "Saída" },
];

export type FiltrosColunaMovimentacoesState = {
	datahora: string;
	historico: string;
	sentido: string;
	planocontasnome: string;
	documento: string;
};

export const filtrosColunaMovimentacoesVazios: FiltrosColunaMovimentacoesState =
	{
		datahora: "",
		historico: "",
		sentido: "",
		planocontasnome: "",
		documento: "",
	};

export type CampoFiltroColunaMovimentacoes =
	keyof FiltrosColunaMovimentacoesState;

export const COLUNA_PARA_CAMPO_FILTRO_MOVIMENTACAO: Record<
	string,
	CampoFiltroColunaMovimentacoes
> = {
	datahora: "datahora",
	historico: "historico",
	entrada: "sentido",
	planocontasnome: "planocontasnome",
	documento: "documento",
};

export const COLUNA_PARA_ORDENAR_MOVIMENTACAO: Record<string, string> = {
	datahora: "datahora",
	historico: "historico",
	entrada: "valor",
	saida: "valor",
	saldoatual: "saldoatual",
	planocontasnome: "planocontasnome",
	documento: "documento",
};

export type ConfigFiltroColunaMovimentacao = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaMovimentacao = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaMovimentacao[] = [
	{ id: "datahora", label: "Data", visivelPadrao: true },
	{ id: "historico", label: "Histórico", visivelPadrao: true },
	{ id: "entrada", label: "Entrada", visivelPadrao: true },
	{ id: "saida", label: "Saída", visivelPadrao: true },
	{ id: "saldoatual", label: "Saldo", visivelPadrao: true },
	{ id: "planocontasnome", label: "Plano", visivelPadrao: true },
	{ id: "documento", label: "Documento", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasMovimentacoes(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatCurrency(value: string | null | undefined): string {
	if (!value) return "R$ 0,00";
	const num = Number(value);
	if (Number.isNaN(num)) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

function ehEntrada(tipo: string | null | undefined) {
	return tipo === "C" || tipo === "E";
}

function ehSaida(tipo: string | null | undefined) {
	return tipo === "D" || tipo === "S";
}

export type OpcoesColunasMovimentacoes = {
	filtros: FiltrosColunaMovimentacoesState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaMovimentacao>;
	renderAcoes: (lancamento: ContaCorrenteLancamento) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasMovimentacoes,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_MOVIMENTACAO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_MOVIMENTACAO[def.id] ?? def.id;
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

export function criarColunasMovimentacoes(
	opcoes: OpcoesColunasMovimentacoes,
): ColumnDef<ContaCorrenteLancamento>[] {
	const colunas: ColumnDef<ContaCorrenteLancamento>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

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
			case "datahora":
				colunas.push({
					id: "datahora",
					accessorKey: "datahora",
					header,
					meta,
					cell: ({ row }) => (
						<div className="min-w-[100px]">
							{formatDateOnlyDisplay(row.original.datahora)}
						</div>
					),
				});
				break;
			case "historico":
				colunas.push({
					id: "historico",
					accessorKey: "historico",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[200px] truncate">
							{row.original.historico || "-"}
						</div>
					),
				});
				break;
			case "entrada":
				colunas.push({
					id: "entrada",
					header,
					meta,
					cell: ({ row }) => {
						if (ehEntrada(row.original.tipo)) {
							return (
								<div className="text-right font-medium text-green-600 dark:text-green-400">
									{formatCurrency(row.original.valor)}
								</div>
							);
						}
						return <div className="text-right">-</div>;
					},
				});
				break;
			case "saida":
				colunas.push({
					id: "saida",
					header,
					meta,
					cell: ({ row }) => {
						if (ehSaida(row.original.tipo)) {
							return (
								<div className="text-right font-medium text-red-600 dark:text-red-400">
									{formatCurrency(row.original.valor)}
								</div>
							);
						}
						return <div className="text-right">-</div>;
					},
				});
				break;
			case "saldoatual":
				colunas.push({
					id: "saldoatual",
					accessorKey: "saldoatual",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-right font-semibold">
							{formatCurrency(row.original.saldoatual)}
						</div>
					),
				});
				break;
			case "planocontasnome":
				colunas.push({
					id: "planocontasnome",
					accessorKey: "planocontasnome",
					header,
					meta,
					cell: ({ row }) => (
						<div className="min-w-[150px]">
							{row.original.planocontasnome || "-"}
						</div>
					),
				});
				break;
			case "documento":
				colunas.push({
					id: "documento",
					accessorKey: "documento",
					header,
					meta,
					cell: ({ row }) => row.original.documento || "-",
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
