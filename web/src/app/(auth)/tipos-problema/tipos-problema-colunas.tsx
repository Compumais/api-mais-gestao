import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { TipoProblema } from "@/services/tipo-problema.service";

export const STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Ativo" },
	{ value: "1", label: "Inativo" },
];

export type FiltrosColunaTiposProblemaState = {
	descricao: string;
	codigo: string;
	inativo: string;
};

export const filtrosColunaTiposProblemaVazios: FiltrosColunaTiposProblemaState =
	{
		descricao: "",
		codigo: "",
		inativo: "",
	};

export type CampoFiltroColunaTiposProblema =
	keyof FiltrosColunaTiposProblemaState;

export const COLUNA_PARA_CAMPO_FILTRO_TIPO_PROBLEMA: Record<
	string,
	CampoFiltroColunaTiposProblema
> = {
	descricao: "descricao",
	codigo: "codigo",
	status: "inativo",
};

export type ConfigFiltroColunaTipoProblema = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaTipoProblema = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaTipoProblema[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "descricao", label: "Descrição", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasTiposProblema(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasTiposProblema = {
	filtros: FiltrosColunaTiposProblemaState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaTipoProblema>;
	renderAcoes: (tipoProblema: TipoProblema) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasTiposProblema,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_TIPO_PROBLEMA[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = def.id === "status" ? "inativo" : def.id;
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

export function criarColunasTiposProblema(
	opcoes: OpcoesColunasTiposProblema,
): ColumnDef<TipoProblema>[] {
	const colunas: ColumnDef<TipoProblema>[] = [];

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
					accessorKey: "codigo",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.codigo || "-"}</div>,
				});
				break;
			case "descricao":
				colunas.push({
					accessorKey: "descricao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-md truncate">
							{row.original.descricao || "-"}
						</div>
					),
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					header,
					meta,
					cell: ({ row }) =>
						row.original.inativo === 1 ? (
							<Badge variant="secondary">Inativo</Badge>
						) : (
							<Badge variant="outline">Ativo</Badge>
						),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
