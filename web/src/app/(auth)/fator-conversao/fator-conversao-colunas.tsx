import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import {
	type FatorConversao,
	formatarFatorConversao,
} from "@/services/fator-conversao.service";

export type FiltrosColunaFatorConversaoState = {
	nome: string;
	fator: string;
};

export const filtrosColunaFatorConversaoVazios: FiltrosColunaFatorConversaoState =
	{
		nome: "",
		fator: "",
	};

export type CampoFiltroColunaFatorConversao =
	keyof FiltrosColunaFatorConversaoState;

export const COLUNA_PARA_CAMPO_FILTRO_FATOR_CONVERSAO: Record<
	string,
	CampoFiltroColunaFatorConversao
> = {
	nome: "nome",
	fator: "fator",
};

export type ConfigFiltroColunaFatorConversao = {
	tipo: TipoFiltroColunaTabela;
	placeholder?: string;
};

type DefinicaoColunaFatorConversao = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaFatorConversao[] = [
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "fator", label: "Fator", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasFatorConversao(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasFatorConversao = {
	filtros: FiltrosColunaFatorConversaoState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaFatorConversao>;
	renderAcoes: (fator: FatorConversao) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasFatorConversao,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_FATOR_CONVERSAO[def.id];
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
			placeholderFiltro={configFiltro.placeholder}
		/>
	);
}

export function criarColunasFatorConversao(
	opcoes: OpcoesColunasFatorConversao,
): ColumnDef<FatorConversao>[] {
	const colunas: ColumnDef<FatorConversao>[] = [];

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
			case "nome":
				colunas.push({
					accessorKey: "nome",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.nome ?? "-"}</div>,
				});
				break;
			case "fator":
				colunas.push({
					accessorKey: "fator",
					header,
					meta,
					cell: ({ row }) => (
						<div className="tabular-nums">
							{formatarFatorConversao(row.original.fator)}
						</div>
					),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
