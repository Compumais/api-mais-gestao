import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import Image from "next/image";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import type { Hierarquia } from "@/services/hierarquias.service";

export const CLASSE_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Revenda" },
	{ value: "1", label: "Matéria-prima" },
	{ value: "2", label: "Mat. embalagem" },
	{ value: "3", label: "Consumo interno" },
];

export const ORIGEM_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Nacional" },
	{ value: "1", label: "Importação direta" },
	{ value: "2", label: "Adquirida no mercado interno" },
];

const CLASSE_LABEL: Record<string, string> = Object.fromEntries(
	CLASSE_OPCOES_FILTRO.map((o) => [o.value, o.label]),
);

const ORIGEM_LABEL: Record<string, string> = Object.fromEntries(
	ORIGEM_OPCOES_FILTRO.map((o) => [o.value, o.label]),
);

export type FiltrosColunaGruposState = {
	codigo: string;
	nome: string;
	ncm: string;
	classe: string;
	origem: string;
	comissao: string;
	enviamobile: string;
};

export const filtrosColunaGruposVazios: FiltrosColunaGruposState = {
	codigo: "",
	nome: "",
	ncm: "",
	classe: "",
	origem: "",
	comissao: "",
	enviamobile: "",
};

export type CampoFiltroColunaGrupos = keyof FiltrosColunaGruposState;

export const COLUNA_PARA_CAMPO_FILTRO_GRUPO: Record<
	string,
	CampoFiltroColunaGrupos
> = {
	codigo: "codigo",
	nome: "nome",
	ncm: "ncm",
	classe: "classe",
	origem: "origem",
	comissao: "comissao",
	enviamobile: "enviamobile",
};

export type ConfigFiltroColunaGrupo = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaGrupo = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaGrupo[] = [
	{ id: "foto", label: "Foto", visivelPadrao: true },
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "ncm", label: "NCM", visivelPadrao: true },
	{ id: "classe", label: "Classe", visivelPadrao: false },
	{ id: "origem", label: "Origem", visivelPadrao: false },
	{ id: "comissao", label: "Comissão", visivelPadrao: false },
	{ id: "enviamobile", label: "Envia mobile", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasGrupos(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatarClasse(valor: number | null | undefined) {
	if (valor === null || valor === undefined) return "-";
	return CLASSE_LABEL[String(valor)] ?? String(valor);
}

function formatarOrigem(valor: number | null | undefined) {
	if (valor === null || valor === undefined) return "-";
	return ORIGEM_LABEL[String(valor)] ?? String(valor);
}

function formatarComissao(valor: string | null | undefined) {
	if (valor === null || valor === undefined || valor === "") return "-";
	const numero = Number.parseFloat(valor);
	if (Number.isNaN(numero)) return valor;
	return `${new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(numero)}%`;
}

export type OpcoesColunasGrupos = {
	filtros: FiltrosColunaGruposState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaGrupo>;
	renderAcoes: (hierarquia: Hierarquia) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasGrupos,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_GRUPO[def.id];
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

export function criarColunasGrupos(
	opcoes: OpcoesColunasGrupos,
): ColumnDef<Hierarquia>[] {
	const colunas: ColumnDef<Hierarquia>[] = [];

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

		if (def.id === "foto") {
			colunas.push({
				id: "foto",
				header: "Foto",
				meta,
				cell: ({ row }) => {
					const icone = row.original.icone;
					if (!icone) {
						return <span className="text-muted-foreground">—</span>;
					}
					return (
						<Image
							width={64}
							height={64}
							src={icone}
							alt=""
							className="size-8 rounded-md border object-cover"
						/>
					);
				},
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
			case "ncm":
				colunas.push({
					accessorKey: "ncm",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.ncm ?? "-"}</div>,
				});
				break;
			case "classe":
				colunas.push({
					accessorKey: "classe",
					header,
					meta,
					cell: ({ row }) => <div>{formatarClasse(row.original.classe)}</div>,
				});
				break;
			case "origem":
				colunas.push({
					accessorKey: "origem",
					header,
					meta,
					cell: ({ row }) => <div>{formatarOrigem(row.original.origem)}</div>,
				});
				break;
			case "comissao":
				colunas.push({
					accessorKey: "comissao",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarComissao(row.original.comissao)}</div>
					),
				});
				break;
			case "enviamobile":
				colunas.push({
					accessorKey: "enviamobile",
					header,
					meta,
					cell: ({ row }) => {
						const ativo = row.original.enviamobile === 1;
						return (
							<span
								className={
									ativo
										? "text-green-600 dark:text-green-400"
										: "text-muted-foreground"
								}
							>
								{ativo ? "Ativo" : "Inativo"}
							</span>
						);
					},
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
