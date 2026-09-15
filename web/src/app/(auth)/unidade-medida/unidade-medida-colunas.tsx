import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import {
	isUnidadeMedidaGlobal,
	type UnidadeMedida,
} from "@/services/unidade-medida.service";

export const ORIGEM_UNIDADE_MEDIDA_OPCOES: OpcaoFiltroColunaTabela[] = [
	{ value: "sistema", label: "Sistema" },
	{ value: "empresa", label: "Empresa" },
];

export type FiltrosColunaUnidadeMedidaState = {
	codigo: string;
	nome: string;
	origem: string;
	casasdecimais: string;
	tipovalor: string;
};

export const filtrosColunaUnidadeMedidaVazios: FiltrosColunaUnidadeMedidaState =
	{
		codigo: "",
		nome: "",
		origem: "",
		casasdecimais: "",
		tipovalor: "",
	};

export type CampoFiltroColunaUnidadeMedida =
	keyof FiltrosColunaUnidadeMedidaState;

export const COLUNA_PARA_CAMPO_FILTRO_UNIDADE_MEDIDA: Record<
	string,
	CampoFiltroColunaUnidadeMedida
> = {
	codigo: "codigo",
	nome: "nome",
	origem: "origem",
	casasdecimais: "casasdecimais",
	tipovalor: "tipovalor",
};

export type ConfigFiltroColunaUnidadeMedida = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaUnidadeMedida = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaUnidadeMedida[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "origem", label: "Origem", visivelPadrao: true },
	{ id: "casasdecimais", label: "Casas decimais", visivelPadrao: false },
	{ id: "tipovalor", label: "Tipo valor", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasUnidadeMedida(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasUnidadeMedida = {
	filtros: FiltrosColunaUnidadeMedidaState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaUnidadeMedida>;
	renderAcoes: (unidadeMedida: UnidadeMedida) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasUnidadeMedida,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_UNIDADE_MEDIDA[def.id];
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

function renderOrigem(unidadeMedida: UnidadeMedida) {
	return isUnidadeMedidaGlobal(unidadeMedida) ? (
		<Badge variant="secondary">Sistema</Badge>
	) : (
		<Badge variant="outline">Empresa</Badge>
	);
}

export function criarColunasUnidadeMedida(
	opcoes: OpcoesColunasUnidadeMedida,
): ColumnDef<UnidadeMedida>[] {
	const colunas: ColumnDef<UnidadeMedida>[] = [];

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
					cell: ({ row }) => <div>{row.original.codigo ?? "-"}</div>,
				});
				break;
			case "nome":
				colunas.push({
					accessorKey: "nome",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.nome ?? "-"}</div>,
				});
				break;
			case "origem":
				colunas.push({
					id: "origem",
					header,
					meta,
					cell: ({ row }) => renderOrigem(row.original),
				});
				break;
			case "casasdecimais":
				colunas.push({
					accessorKey: "casasdecimais",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							{row.original.casasdecimais !== null &&
							row.original.casasdecimais !== undefined
								? row.original.casasdecimais
								: "-"}
						</div>
					),
				});
				break;
			case "tipovalor":
				colunas.push({
					accessorKey: "tipovalor",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							{row.original.tipovalor !== null &&
							row.original.tipovalor !== undefined
								? row.original.tipovalor
								: "-"}
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
