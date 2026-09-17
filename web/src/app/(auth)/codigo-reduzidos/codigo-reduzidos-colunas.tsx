import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { ContaContabil } from "@/services/conta-contabil.service";

export const NATUREZA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "D", label: "Devedora" },
	{ value: "C", label: "Credora" },
];

export const TIPO_CONTA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "S", label: "Sintética" },
	{ value: "A", label: "Analítica" },
];

export const SITUACAO_CODIGO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "com", label: "Com código" },
	{ value: "sem", label: "Sem código" },
];

export const INATIVO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Ativa" },
	{ value: "1", label: "Inativa" },
];

export type FiltrosColunaCodigosReduzidosState = {
	codigoreduzido: string;
	descricao: string;
	codigoextenso: string;
	natureza: string;
	tipocontacontabil: string;
	situacaoCodigo: string;
	inativo: string;
};

export const filtrosColunaCodigosReduzidosVazios: FiltrosColunaCodigosReduzidosState =
	{
		codigoreduzido: "",
		descricao: "",
		codigoextenso: "",
		natureza: "",
		tipocontacontabil: "",
		situacaoCodigo: "",
		inativo: "",
	};

export type CampoFiltroColunaCodigosReduzidos =
	keyof FiltrosColunaCodigosReduzidosState;

export const COLUNA_PARA_CAMPO_FILTRO_CODIGOS_REDUZIDOS: Record<
	string,
	CampoFiltroColunaCodigosReduzidos
> = {
	codigoreduzido: "codigoreduzido",
	descricao: "descricao",
	codigoextenso: "codigoextenso",
	natureza: "natureza",
	tipocontacontabil: "tipocontacontabil",
	situacao: "situacaoCodigo",
	inativo: "inativo",
};

export type ConfigFiltroColunaCodigosReduzidos = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaCodigosReduzidos = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaCodigosReduzidos[] = [
	{ id: "codigoreduzido", label: "Código reduzido", visivelPadrao: true },
	{ id: "descricao", label: "Conta contábil", visivelPadrao: true },
	{ id: "codigoextenso", label: "Código extenso", visivelPadrao: true },
	{ id: "natureza", label: "Natureza", visivelPadrao: true },
	{ id: "tipocontacontabil", label: "Tipo", visivelPadrao: true },
	{ id: "situacao", label: "Situação do código", visivelPadrao: true },
	{ id: "inativo", label: "Status", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasCodigosReduzidos(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasCodigosReduzidos = {
	filtros: FiltrosColunaCodigosReduzidosState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaCodigosReduzidos>;
	renderAcoes: (conta: ContaContabil) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasCodigosReduzidos,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_CODIGOS_REDUZIDOS[def.id];
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

function naturezaLabel(natureza: string | null) {
	if (natureza === "D") return "Devedora";
	if (natureza === "C") return "Credora";
	return "-";
}

function tipoLabel(tipo: string | null) {
	if (tipo === "S") return "Sintética";
	if (tipo === "A") return "Analítica";
	return "-";
}

export function criarColunasCodigosReduzidos(
	opcoes: OpcoesColunasCodigosReduzidos,
): ColumnDef<ContaContabil>[] {
	const colunas: ColumnDef<ContaContabil>[] = [];

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
			case "codigoreduzido":
				colunas.push({
					accessorKey: "codigoreduzido",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">
							{row.original.codigoreduzido?.trim()
								? row.original.codigoreduzido
								: "-"}
						</div>
					),
				});
				break;
			case "descricao":
				colunas.push({
					accessorKey: "descricao",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.descricao ?? "-"}</div>,
				});
				break;
			case "codigoextenso":
				colunas.push({
					accessorKey: "codigoextenso",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.codigoextenso ?? "-"}</div>,
				});
				break;
			case "natureza":
				colunas.push({
					id: "natureza",
					header,
					meta,
					cell: ({ row }) => <div>{naturezaLabel(row.original.natureza)}</div>,
				});
				break;
			case "tipocontacontabil":
				colunas.push({
					id: "tipocontacontabil",
					header,
					meta,
					cell: ({ row }) => (
						<div>{tipoLabel(row.original.tipocontacontabil)}</div>
					),
				});
				break;
			case "situacao":
				colunas.push({
					id: "situacao",
					header,
					meta,
					cell: ({ row }) =>
						row.original.codigoreduzido?.trim() ? (
							<Badge variant="outline">Vinculado</Badge>
						) : (
							<Badge variant="secondary">Sem código</Badge>
						),
				});
				break;
			case "inativo":
				colunas.push({
					id: "inativo",
					header,
					meta,
					cell: ({ row }) =>
						row.original.inativo === 1 ? (
							<Badge variant="secondary">Inativa</Badge>
						) : (
							<Badge variant="outline">Ativa</Badge>
						),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
