import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import type { Produto } from "@/services/produtos.service";

export type FiltrosColunaServicosState = {
	codigo: string;
	nome: string;
	preco: string;
	inativo: string;
	referencia: string;
	unidademedida: string;
	tipoproduto: string;
	custoaquisicao: string;
	datacadastro: string;
	codigolistalc11603: string;
	codigonbs: string;
};

export const filtrosColunaServicosVazios: FiltrosColunaServicosState = {
	codigo: "",
	nome: "",
	preco: "",
	inativo: "",
	referencia: "",
	unidademedida: "",
	tipoproduto: "",
	custoaquisicao: "",
	datacadastro: "",
	codigolistalc11603: "",
	codigonbs: "",
};

export type CampoFiltroColunaServicos = keyof FiltrosColunaServicosState;

export const COLUNA_PARA_CAMPO_FILTRO_SERVICO: Record<
	string,
	CampoFiltroColunaServicos
> = {
	codigo: "codigo",
	nome: "nome",
	preco: "preco",
	inativo: "inativo",
	referencia: "referencia",
	unidademedida: "unidademedida",
	tipoproduto: "tipoproduto",
	custoaquisicao: "custoaquisicao",
	datacadastro: "datacadastro",
	codigolistalc11603: "codigolistalc11603",
	codigonbs: "codigonbs",
};

export type ConfigFiltroColunaServico = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaServico = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaServico[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "preco", label: "Preço", visivelPadrao: true },
	{ id: "inativo", label: "Situação", visivelPadrao: true },
	{ id: "referencia", label: "Referência", visivelPadrao: false },
	{ id: "unidademedida", label: "Unidade", visivelPadrao: false },
	{ id: "tipoproduto", label: "Tipo", visivelPadrao: false },
	{ id: "custoaquisicao", label: "Custo", visivelPadrao: false },
	{ id: "datacadastro", label: "Data cadastro", visivelPadrao: false },
	{ id: "codigolistalc11603", label: "LC 116", visivelPadrao: false },
	{ id: "codigonbs", label: "NBS", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasServicos(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatarPreco(preco: string | null | undefined) {
	if (!preco) return "-";
	const numero = Number.parseFloat(preco);
	if (Number.isNaN(numero)) return "-";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

function formatarDataCadastro(valor: string | null | undefined) {
	if (!valor) return "-";
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return new Intl.DateTimeFormat("pt-BR").format(data);
}

export type OpcoesColunasServicos = {
	filtros: FiltrosColunaServicosState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaServico>;
	renderAcoes: (servico: Produto) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasServicos,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_SERVICO[def.id];
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

export function criarColunasServicos(
	opcoes: OpcoesColunasServicos,
): ColumnDef<Produto>[] {
	const colunas: ColumnDef<Produto>[] = [];

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
					cell: ({ row }) => <div>{row.original.nome}</div>,
				});
				break;
			case "preco":
				colunas.push({
					accessorKey: "preco",
					header,
					meta,
					cell: ({ row }) => <div>{formatarPreco(row.original.preco)}</div>,
				});
				break;
			case "inativo":
				colunas.push({
					accessorKey: "inativo",
					header,
					meta,
					cell: ({ row }) => {
						const inativo = row.original.inativo === 1;
						return (
							<span
								className={
									inativo
										? "text-muted-foreground"
										: "text-green-600 dark:text-green-400"
								}
							>
								{inativo ? "Inativo" : "Ativo"}
							</span>
						);
					},
				});
				break;
			case "referencia":
				colunas.push({
					accessorKey: "referencia",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.referencia ?? "-"}</div>,
				});
				break;
			case "unidademedida":
				colunas.push({
					id: "unidademedida",
					accessorFn: (row) => row.unidademedida,
					header,
					meta,
					cell: ({ row }) => <div>{row.original.unidademedida ?? "-"}</div>,
				});
				break;
			case "tipoproduto":
				colunas.push({
					accessorKey: "tipoproduto",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.tipoproduto ?? "-"}</div>,
				});
				break;
			case "custoaquisicao":
				colunas.push({
					accessorKey: "custoaquisicao",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarPreco(row.original.custoaquisicao)}</div>
					),
				});
				break;
			case "datacadastro":
				colunas.push({
					accessorKey: "datacadastro",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarDataCadastro(row.original.datacadastro)}</div>
					),
				});
				break;
			case "codigolistalc11603":
				colunas.push({
					accessorKey: "codigolistalc11603",
					header,
					meta,
					cell: ({ row }) => (
						<div>{row.original.codigolistalc11603 ?? "-"}</div>
					),
				});
				break;
			case "codigonbs":
				colunas.push({
					accessorKey: "codigonbs",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.codigonbs ?? "-"}</div>,
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
