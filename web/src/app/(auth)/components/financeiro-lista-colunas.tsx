import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import type { Financeiro } from "@/services/financeiro.service";

export type VarianteFinanceiroLista = "pagar" | "receber";

export const STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "A", label: "Aberto" },
	{ value: "P", label: "Pago" },
	{ value: "Q", label: "Quitado" },
	{ value: "S", label: "Substituído" },
	{ value: "C", label: "Cancelado" },
	{ value: "V", label: "Vencido" },
];

export type FiltrosColunaFinanceiroState = {
	documento: string;
	emitente: string;
	status: string;
	emissao: string;
	vencimento: string;
};

export const filtrosColunaFinanceiroVazios: FiltrosColunaFinanceiroState = {
	documento: "",
	emitente: "",
	status: "",
	emissao: "",
	vencimento: "",
};

export type CampoFiltroColunaFinanceiro = keyof FiltrosColunaFinanceiroState;

export const COLUNA_PARA_CAMPO_FILTRO_FINANCEIRO: Record<
	string,
	CampoFiltroColunaFinanceiro
> = {
	documento: "documento",
	emitente: "emitente",
	status: "status",
	emissao: "emissao",
	vencimento: "vencimento",
};

export const COLUNA_PARA_ORDENAR_FINANCEIRO: Record<string, string> = {
	documento: "documento",
	emitente: "emitente",
	parcela: "parcela",
	status: "status",
	emissao: "emissao",
	vencimento: "vencimento",
	valor: "valor",
	saldo: "saldo",
};

export type ConfigFiltroColunaFinanceiro = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaFinanceiro = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
	somenteReceber?: boolean;
};

const DEFINICOES_BASE: DefinicaoColunaFinanceiro[] = [
	{ id: "select", label: "Seleção", visivelPadrao: true, enableHiding: false },
	{ id: "documento", label: "Documento", visivelPadrao: true },
	{ id: "emitente", label: "Nome", visivelPadrao: true },
	{ id: "parcela", label: "Parcela", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "emissao", label: "Emissão", visivelPadrao: true },
	{ id: "vencimento", label: "Vencimento", visivelPadrao: true },
	{ id: "valor", label: "Valor", visivelPadrao: true },
	{ id: "saldo", label: "Saldo", visivelPadrao: true },
	{
		id: "saldoSemJurosMulta",
		label: "Saldo sem juros/multa",
		visivelPadrao: true,
		somenteReceber: true,
	},
	{ id: "tipo", label: "Tipo", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

function definicoesParaVariante(variante: VarianteFinanceiroLista) {
	return DEFINICOES_BASE.filter(
		(def) => !def.somenteReceber || variante === "receber",
	);
}

export function visibilidadePadraoColunasFinanceiro(
	variante: VarianteFinanceiroLista,
): VisibilityState {
	const state: VisibilityState = {};
	for (const def of definicoesParaVariante(variante)) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export function formatCurrency(value: string | null | undefined) {
	if (!value) return "R$ 0,00";
	const num = Number.parseFloat(value);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

export function formatDate(date: string | null | undefined) {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("pt-BR");
}

export function formatParcela(
	parcela: number | null | undefined,
	totalParcelas: number | null | undefined,
	variante: VarianteFinanceiroLista,
) {
	if (variante === "receber") {
		const atual = parcela && parcela > 0 ? parcela : 1;
		if (totalParcelas && totalParcelas > 1) {
			return `${atual}/${totalParcelas}`;
		}
		return String(atual);
	}
	if (!parcela) return "-";
	if (totalParcelas && totalParcelas > 1) {
		return `${parcela}/${totalParcelas}`;
	}
	return String(parcela);
}

const documentoPareceUuid = (valor: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		valor,
	);

export function formatDocumento(
	financeiro: Financeiro,
	variante: VarianteFinanceiroLista,
) {
	if (variante === "pagar") {
		return financeiro.documento || "-";
	}
	const documento = financeiro.documento?.trim() ?? "";
	if (!documento || documentoPareceUuid(documento)) {
		return financeiro.historico?.trim() || "Venda PDV";
	}
	return documento;
}

export function formatNome(
	financeiro: Financeiro,
	variante: VarianteFinanceiroLista,
) {
	if (variante === "pagar") {
		return financeiro.emitente || "-";
	}
	return financeiro.emitente?.trim() || financeiro.historico?.trim() || "-";
}

export function getStatusBadge(status: string | null | undefined) {
	if (!status) return <Badge variant="outline">-</Badge>;

	const statusMap: Record<
		string,
		{
			label: string;
			variant: "default" | "secondary" | "destructive" | "outline";
		}
	> = {
		A: { label: "Aberto", variant: "default" },
		P: { label: "Pago", variant: "secondary" },
		Q: { label: "Quitado", variant: "secondary" },
		S: { label: "Substituído", variant: "outline" },
		C: { label: "Cancelado", variant: "destructive" },
		V: { label: "Vencido", variant: "destructive" },
	};

	const statusInfo = statusMap[status] || {
		label: status,
		variant: "outline" as const,
	};

	return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

export function calculateSaldoSemJurosMulta(financeiro: Financeiro) {
	const saldo = Number.parseFloat(financeiro.saldo || "0");
	const juros = financeiro.juros || 0;
	const multa = financeiro.multa || 0;
	return saldo - juros - multa;
}

export function podeDarBaixa(financeiro: Financeiro) {
	return financeiro.status === "A" && !financeiro.baixa;
}

export type OpcoesColunasFinanceiro = {
	variante: VarianteFinanceiroLista;
	filtros: FiltrosColunaFinanceiroState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaFinanceiro>;
	renderSelectHeader: (table: {
		getIsAllPageRowsSelected: () => boolean;
		getIsSomePageRowsSelected: () => boolean;
		toggleAllPageRowsSelected: (value: boolean) => void;
	}) => ReactNode;
	renderSelectCell: (row: {
		getIsSelected: () => boolean;
		getCanSelect: () => boolean;
		toggleSelected: (value: boolean) => void;
		original: Financeiro;
	}) => ReactNode;
	renderAcoes: (financeiro: Financeiro) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasFinanceiro,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_FINANCEIRO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_FINANCEIRO[def.id];
	const ordenacao: OrdenacaoColunaTabela =
		ordenacaoCampo &&
		opcoes.ordenarPor === ordenacaoCampo &&
		opcoes.ordem
			? opcoes.ordem
			: false;

	return (
		<CabecalhoColunaTabela
			titulo={def.label}
			colunaId={def.id}
			ordenacao={ordenacao}
			onOrdenar={(direcao) => {
				if (!ordenacaoCampo) return;
				opcoes.onOrdenarColuna(ordenacaoCampo, direcao);
			}}
			filtroAtivo={filtroAtivo}
			valorFiltro={valorFiltro}
			onFiltrar={(valor) => opcoes.onFiltrarColuna(def.id, valor)}
			tipoFiltro={configFiltro.tipo}
			opcoes={configFiltro.opcoes}
			placeholderFiltro={configFiltro.placeholder}
		/>
	);
}

export function criarColunasFinanceiro(
	opcoes: OpcoesColunasFinanceiro,
): ColumnDef<Financeiro>[] {
	const colunas: ColumnDef<Financeiro>[] = [];

	for (const def of definicoesParaVariante(opcoes.variante)) {
		const meta = { label: def.label };

		if (def.id === "select") {
			colunas.push({
				id: "select",
				header: ({ table }) => opcoes.renderSelectHeader(table),
				cell: ({ row }) => opcoes.renderSelectCell(row),
				enableSorting: false,
				enableHiding: false,
				meta,
			});
			continue;
		}

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

		if (def.id === "saldoSemJurosMulta") {
			colunas.push({
				id: "saldoSemJurosMulta",
				header: () => (
					<div className="text-right">{def.label}</div>
				),
				enableSorting: false,
				meta,
				cell: ({ row }) => {
					const saldoSemJurosMulta = calculateSaldoSemJurosMulta(row.original);
					return (
						<div className="text-right font-medium">
							{formatCurrency(saldoSemJurosMulta.toString())}
						</div>
					);
				},
			});
			continue;
		}

		if (def.id === "tipo") {
			colunas.push({
				id: "tipo",
				accessorKey: "tipo",
				header: def.label,
				meta,
				cell: ({ row }) => {
					const tipo = row.original.tipo;
					return (
						<Badge variant="outline">
							{tipo === "P" ? "Pagar" : tipo === "R" ? "Receber" : "-"}
						</Badge>
					);
				},
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "documento":
				colunas.push({
					id: "documento",
					accessorKey: "documento",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">
							{formatDocumento(row.original, opcoes.variante)}
						</div>
					),
				});
				break;
			case "emitente":
				colunas.push({
					id: "emitente",
					accessorKey: "emitente",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[220px] truncate">
							{formatNome(row.original, opcoes.variante)}
						</div>
					),
				});
				break;
			case "parcela":
				colunas.push({
					id: "parcela",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							{formatParcela(
								row.original.parcela,
								row.original.totalparcelas,
								opcoes.variante,
							)}
						</div>
					),
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					accessorKey: "status",
					header,
					meta,
					cell: ({ row }) => getStatusBadge(row.original.status),
				});
				break;
			case "emissao":
				colunas.push({
					id: "emissao",
					accessorKey: "emissao",
					header,
					meta,
					cell: ({ row }) => <div>{formatDate(row.original.emissao)}</div>,
				});
				break;
			case "vencimento":
				colunas.push({
					id: "vencimento",
					accessorKey: "vencimento",
					header,
					meta,
					cell: ({ row }) => <div>{formatDate(row.original.vencimento)}</div>,
				});
				break;
			case "valor":
				colunas.push({
					id: "valor",
					accessorKey: "valor",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-right font-medium">
							{formatCurrency(row.original.valor)}
						</div>
					),
				});
				break;
			case "saldo":
				colunas.push({
					id: "saldo",
					accessorKey: "saldo",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-right font-medium">
							{formatCurrency(row.original.saldo)}
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
