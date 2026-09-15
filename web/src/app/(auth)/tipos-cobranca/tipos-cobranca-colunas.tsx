import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import type { TipoCobranca } from "@/services/tipo-cobranca.service";

export type FiltrosColunaTiposCobrancaState = {
	codigo: string;
	descricao: string;
	idtipodocumentofinanceiro: string;
};

export const filtrosColunaTiposCobrancaVazios: FiltrosColunaTiposCobrancaState =
	{
		codigo: "",
		descricao: "",
		idtipodocumentofinanceiro: "",
	};

export type CampoFiltroColunaTiposCobranca =
	keyof FiltrosColunaTiposCobrancaState;

export const COLUNA_PARA_CAMPO_FILTRO_TIPO_COBRANCA: Record<
	string,
	CampoFiltroColunaTiposCobranca
> = {
	codigo: "codigo",
	descricao: "descricao",
	tipodocumento: "idtipodocumentofinanceiro",
};

export type ConfigFiltroColunaTipoCobranca = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaTipoCobranca = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaTipoCobranca[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "descricao", label: "Descrição", visivelPadrao: true },
	{ id: "tipodocumento", label: "Tipo de documento", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasTiposCobranca(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasTiposCobranca = {
	filtros: FiltrosColunaTiposCobrancaState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	mapaTipoDocumento: Record<string, string>;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaTipoCobranca>;
	renderAcoes: (tipoCobranca: TipoCobranca) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasTiposCobranca,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_TIPO_COBRANCA[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo =
		def.id === "tipodocumento" ? "idtipodocumentofinanceiro" : def.id;
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === ordenacaoCampo && opcoes.ordem ? opcoes.ordem : false;

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

export function criarColunasTiposCobranca(
	opcoes: OpcoesColunasTiposCobranca,
): ColumnDef<TipoCobranca>[] {
	const colunas: ColumnDef<TipoCobranca>[] = [];

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
					cell: ({ row }) => <div>{row.original.codigo}</div>,
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
			case "tipodocumento":
				colunas.push({
					id: "tipodocumento",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-md truncate">
							{opcoes.mapaTipoDocumento[
								row.original.idtipodocumentofinanceiro
							] || "-"}
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
