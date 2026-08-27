import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { RegistroProducao } from "@/services/producao.service";

export const ORIGEM_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Massa" },
	{ value: "1", label: "Venda" },
];

export type FiltrosColunaProducoesState = {
	datahora: string;
	nome: string;
	codigo: string;
	origem: string;
};

export const filtrosColunaProducoesVazios: FiltrosColunaProducoesState = {
	datahora: "",
	nome: "",
	codigo: "",
	origem: "",
};

export type CampoFiltroColunaProducoes = keyof FiltrosColunaProducoesState;

export const COLUNA_PARA_CAMPO_FILTRO_PRODUCAO: Record<
	string,
	CampoFiltroColunaProducoes
> = {
	datahora: "datahora",
	nome: "nome",
	codigo: "codigo",
	origem: "origem",
};

export const COLUNA_PARA_ORDENAR_PRODUCAO: Record<string, string> = {
	datahora: "datahora",
	nome: "nome",
	codigo: "codigo",
	quantidadeproduzida: "quantidadeproduzida",
	origem: "origem",
	custounitario: "custounitario",
	custototal: "custototal",
};

export type ConfigFiltroColunaProducao = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaProducao = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaProducao[] = [
	{ id: "datahora", label: "Data", visivelPadrao: true },
	{ id: "nome", label: "Produto", visivelPadrao: true },
	{ id: "codigo", label: "Código", visivelPadrao: false },
	{ id: "quantidadeproduzida", label: "Qtd.", visivelPadrao: true },
	{ id: "origem", label: "Origem", visivelPadrao: true },
	{ id: "custounitario", label: "Custo unit.", visivelPadrao: true },
	{ id: "custototal", label: "Custo total", visivelPadrao: true },
];

export function visibilidadePadraoColunasProducoes(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatarMoeda(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "—";
	return n.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

function formatarQtd(valor: string) {
	const n = Number.parseFloat(valor);
	if (Number.isNaN(n)) return valor;
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

function formatarData(valor: string) {
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleString("pt-BR");
}

export type OpcoesColunasProducoes = {
	filtros: FiltrosColunaProducoesState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaProducao>;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasProducoes,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_PRODUCAO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_PRODUCAO[def.id] ?? def.id;
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

export function criarColunasProducoes(
	opcoes: OpcoesColunasProducoes,
): ColumnDef<RegistroProducao>[] {
	const colunas: ColumnDef<RegistroProducao>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };
		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "datahora":
				colunas.push({
					id: "datahora",
					accessorKey: "datahora",
					header,
					meta,
					cell: ({ row }) => formatarData(row.original.datahora),
				});
				break;
			case "nome":
				colunas.push({
					id: "nome",
					accessorKey: "nomeprodutoacabado",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							<div>{row.original.nomeprodutoacabado ?? "—"}</div>
							<div className="text-xs text-muted-foreground tabular-nums">
								{row.original.codigoprodutoacabado ?? ""}
							</div>
						</div>
					),
				});
				break;
			case "codigo":
				colunas.push({
					id: "codigo",
					accessorKey: "codigoprodutoacabado",
					header,
					meta,
					cell: ({ row }) => (
						<span className="tabular-nums">
							{row.original.codigoprodutoacabado ?? "—"}
						</span>
					),
				});
				break;
			case "quantidadeproduzida":
				colunas.push({
					id: "quantidadeproduzida",
					accessorKey: "quantidadeproduzida",
					header,
					meta,
					cell: ({ row }) => (
						<span className="tabular-nums">
							{formatarQtd(row.original.quantidadeproduzida)}
						</span>
					),
				});
				break;
			case "origem":
				colunas.push({
					id: "origem",
					accessorKey: "origem",
					header,
					meta,
					cell: ({ row }) =>
						row.original.origem === 0 ? (
							<Badge variant="secondary">Massa</Badge>
						) : (
							<Badge variant="secondary">Venda</Badge>
						),
				});
				break;
			case "custounitario":
				colunas.push({
					id: "custounitario",
					accessorKey: "custounitario",
					header,
					meta,
					cell: ({ row }) => formatarMoeda(row.original.custounitario),
				});
				break;
			case "custototal":
				colunas.push({
					id: "custototal",
					accessorKey: "custototal",
					header,
					meta,
					cell: ({ row }) => formatarMoeda(row.original.custototal),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
