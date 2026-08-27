import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { TipoDocumentoFinanceiro } from "@/services/tipo-documento-financeiro.service";

export const FORMAS_NFE = [
	{ codigo: "01", descricao: "Dinheiro" },
	{ codigo: "02", descricao: "Cheque" },
	{ codigo: "03", descricao: "Cartão de crédito" },
	{ codigo: "04", descricao: "Cartão de débito" },
	{ codigo: "15", descricao: "Boleto" },
	{ codigo: "17", descricao: "PIX" },
	{ codigo: "99", descricao: "Crediário / outros" },
] as const;

export type DestinoFinanceiroForma = "caixa" | "recebivel" | "contas_receber";

export const FORMAS_NFE_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = FORMAS_NFE.map(
	(forma) => ({
		value: forma.codigo,
		label: `${forma.codigo} — ${forma.descricao}`,
	}),
);

export const DESTINO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "caixa", label: "Caixa (à vista)" },
	{ value: "recebivel", label: "Contas a receber (cartão/operadora)" },
	{ value: "contas_receber", label: "Contas a receber (cliente)" },
];

export function destinoDaForma(
	forma: Pick<TipoDocumentoFinanceiro, "aprazo" | "integracaixabanco">,
): DestinoFinanceiroForma {
	if (forma.aprazo === 1) return "contas_receber";
	if (forma.integracaixabanco === 1) return "caixa";
	return "recebivel";
}

export function flagsDoDestino(destino: DestinoFinanceiroForma): {
	aprazo: number;
	integracaixabanco: number;
} {
	if (destino === "caixa") {
		return { aprazo: 0, integracaixabanco: 1 };
	}
	if (destino === "contas_receber") {
		return { aprazo: 1, integracaixabanco: 0 };
	}
	return { aprazo: 0, integracaixabanco: 0 };
}

export function rotuloDestino(destino: DestinoFinanceiroForma): string {
	if (destino === "caixa") return "Caixa (à vista)";
	if (destino === "contas_receber") return "Contas a receber (cliente)";
	return "Contas a receber (cartão/operadora)";
}

export type FiltrosColunaFormasErpState = {
	descricao: string;
	formapagamentonfe: string;
	destino: string;
	prazodias: string;
};

export const filtrosColunaFormasErpVazios: FiltrosColunaFormasErpState = {
	descricao: "",
	formapagamentonfe: "",
	destino: "",
	prazodias: "",
};

export type CampoFiltroColunaFormasErp = keyof FiltrosColunaFormasErpState;

export const COLUNA_PARA_CAMPO_FILTRO_FORMAS_ERP: Record<
	string,
	CampoFiltroColunaFormasErp
> = {
	descricao: "descricao",
	formapagamentonfe: "formapagamentonfe",
	destino: "destino",
	prazodias: "prazodias",
};

export type ConfigFiltroColunaFormasErp = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaFormasErp = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaFormasErp[] = [
	{ id: "descricao", label: "Descrição", visivelPadrao: true },
	{ id: "formapagamentonfe", label: "Cód. NF-e", visivelPadrao: true },
	{ id: "destino", label: "Destino financeiro", visivelPadrao: true },
	{ id: "prazodias", label: "Prazo (dias)", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasFormasErp(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasFormasErp = {
	filtros: FiltrosColunaFormasErpState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaFormasErp>;
	renderAcoes: (forma: TipoDocumentoFinanceiro) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasFormasErp,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_FORMAS_ERP[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = def.id === "destino" ? "aprazo" : def.id;
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

export function criarColunasFormasErp(
	opcoes: OpcoesColunasFormasErp,
): ColumnDef<TipoDocumentoFinanceiro>[] {
	const colunas: ColumnDef<TipoDocumentoFinanceiro>[] = [];

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
			case "descricao":
				colunas.push({
					accessorKey: "descricao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">{row.original.descricao}</div>
					),
				});
				break;
			case "formapagamentonfe":
				colunas.push({
					accessorKey: "formapagamentonfe",
					header,
					meta,
					cell: ({ row }) => (
						<div>{row.original.formapagamentonfe ?? "—"}</div>
					),
				});
				break;
			case "destino":
				colunas.push({
					id: "destino",
					header,
					meta,
					cell: ({ row }) => {
						const destino = destinoDaForma(row.original);
						return (
							<Badge
								variant={destino === "caixa" ? "secondary" : "default"}
							>
								{rotuloDestino(destino)}
							</Badge>
						);
					},
				});
				break;
			case "prazodias":
				colunas.push({
					accessorKey: "prazodias",
					header,
					meta,
					cell: ({ row }) => {
						const destino = destinoDaForma(row.original);
						return (
							<div>
								{destino === "caixa" ? "—" : (row.original.prazodias ?? 0)}
							</div>
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
