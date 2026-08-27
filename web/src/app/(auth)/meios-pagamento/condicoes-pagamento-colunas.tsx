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
	ESCOPO_CONDICAO_PAGAMENTO_OPCOES,
	formatarEscopoCondicaoPagamento,
} from "@/schemas/condicao-pagamento.schema";
import type { CondicaoPagamento } from "@/services/condicao-pagamento.service";

export const ESCOPO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] =
	ESCOPO_CONDICAO_PAGAMENTO_OPCOES.map((opcao) => ({
		value: opcao.value,
		label: opcao.label,
	}));

export const STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Ativo" },
	{ value: "1", label: "Inativo" },
];

export type FiltrosColunaCondicoesPagamentoState = {
	codigo: string;
	descricao: string;
	parcelas: string;
	prazos: string;
	escopo: string;
	inativo: string;
};

export const filtrosColunaCondicoesPagamentoVazios: FiltrosColunaCondicoesPagamentoState =
	{
		codigo: "",
		descricao: "",
		parcelas: "",
		prazos: "",
		escopo: "",
		inativo: "",
	};

export type CampoFiltroColunaCondicoesPagamento =
	keyof FiltrosColunaCondicoesPagamentoState;

export const COLUNA_PARA_CAMPO_FILTRO_CONDICAO_PAGAMENTO: Record<
	string,
	CampoFiltroColunaCondicoesPagamento
> = {
	codigo: "codigo",
	descricao: "descricao",
	parcelas: "parcelas",
	prazos: "prazos",
	escopo: "escopo",
	status: "inativo",
};

export type ConfigFiltroColunaCondicaoPagamento = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaCondicaoPagamento = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaCondicaoPagamento[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "descricao", label: "Descrição", visivelPadrao: true },
	{ id: "parcelas", label: "Parcelas", visivelPadrao: true },
	{ id: "prazos", label: "Prazos", visivelPadrao: true },
	{ id: "escopo", label: "Escopo", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasCondicoesPagamento(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasCondicoesPagamento = {
	filtros: FiltrosColunaCondicoesPagamentoState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaCondicaoPagamento>;
	renderAcoes: (registro: CondicaoPagamento) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasCondicoesPagamento,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_CONDICAO_PAGAMENTO[def.id];
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

export function criarColunasCondicoesPagamento(
	opcoes: OpcoesColunasCondicoesPagamento,
): ColumnDef<CondicaoPagamento>[] {
	const colunas: ColumnDef<CondicaoPagamento>[] = [];

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
			case "descricao":
				colunas.push({
					accessorKey: "descricao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-md truncate">
							{row.original.descricao ?? "-"}
						</div>
					),
				});
				break;
			case "parcelas":
				colunas.push({
					accessorKey: "parcelas",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.parcelas ?? "-"}</div>,
				});
				break;
			case "prazos":
				colunas.push({
					accessorKey: "prazos",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.prazos ?? "-"}</div>,
				});
				break;
			case "escopo":
				colunas.push({
					id: "escopo",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarEscopoCondicaoPagamento(row.original.escopo)}</div>
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
