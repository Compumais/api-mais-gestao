import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { FichaProducao } from "@/services/ficha-producao.service";

export const STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "1", label: "Ativa" },
	{ value: "0", label: "Inativa" },
];

export const MODOS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "massa", label: "Massa" },
	{ value: "venda", label: "Na venda" },
];

export type FiltrosColunaFichasProducaoState = {
	codigo: string;
	nome: string;
	modo: string;
	ativo: string;
};

export const filtrosColunaFichasProducaoVazios: FiltrosColunaFichasProducaoState =
	{
		codigo: "",
		nome: "",
		modo: "",
		ativo: "",
	};

export type CampoFiltroColunaFichasProducao =
	keyof FiltrosColunaFichasProducaoState;

export const COLUNA_PARA_CAMPO_FILTRO_FICHA_PRODUCAO: Record<
	string,
	CampoFiltroColunaFichasProducao
> = {
	codigo: "codigo",
	nome: "nome",
	modos: "modo",
	status: "ativo",
};

export const COLUNA_PARA_ORDENAR_FICHA_PRODUCAO: Record<string, string> = {
	codigo: "codigo",
	nome: "nome",
	modos: "permiteproducaomassa",
	status: "ativo",
};

export type ConfigFiltroColunaFichaProducao = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaFichaProducao = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaFichaProducao[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Produto acabado", visivelPadrao: true },
	{ id: "modos", label: "Modos", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasFichasProducao(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasFichasProducao = {
	filtros: FiltrosColunaFichasProducaoState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaFichaProducao>;
	renderAcoes: (ficha: FichaProducao) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasFichasProducao,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_FICHA_PRODUCAO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_FICHA_PRODUCAO[def.id] ?? def.id;
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

export function criarColunasFichasProducao(
	opcoes: OpcoesColunasFichasProducao,
): ColumnDef<FichaProducao>[] {
	const colunas: ColumnDef<FichaProducao>[] = [];

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
			case "codigo":
				colunas.push({
					id: "codigo",
					accessorKey: "codigoprodutoacabado",
					header,
					meta,
					cell: ({ row }) => (
						<div className="tabular-nums">
							{row.original.codigoprodutoacabado ?? "—"}
						</div>
					),
				});
				break;
			case "nome":
				colunas.push({
					id: "nome",
					accessorKey: "nomeprodutoacabado",
					header,
					meta,
					cell: ({ row }) => row.original.nomeprodutoacabado ?? "—",
				});
				break;
			case "modos":
				colunas.push({
					id: "modos",
					header,
					meta,
					cell: ({ row }) => (
						<div className="flex flex-wrap gap-1">
							{row.original.permiteproducaomassa === 1 && (
								<Badge variant="secondary">Massa</Badge>
							)}
							{row.original.producaonavenda === 1 && (
								<Badge variant="secondary">Na venda</Badge>
							)}
						</div>
					),
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					accessorKey: "ativo",
					header,
					meta,
					cell: ({ row }) =>
						row.original.ativo === 1 ? (
							<Badge>Ativa</Badge>
						) : (
							<Badge variant="outline">Inativa</Badge>
						),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
