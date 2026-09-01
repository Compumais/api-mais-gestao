import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Ban, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotaFiscal } from "@/services/nota-fiscal.service";

const STATUS_CONFIRMADA = 1;
const STATUS_CANCELADA = 2;
const STATUS_RASCUNHO = 99;

export const STATUS_COMPRA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "1", label: "Confirmada" },
	{ value: "2", label: "Cancelada" },
	{ value: "99", label: "Rascunho" },
];

export type FiltrosColunaNotaFiscalCompraState = {
	numero: string;
	serie: string;
	razaosocial: string;
	emissao: string;
	entradasaida: string;
	chavenfe: string;
	status: string;
};

export const filtrosColunaNotaFiscalCompraVazios: FiltrosColunaNotaFiscalCompraState =
	{
		numero: "",
		serie: "",
		razaosocial: "",
		emissao: "",
		entradasaida: "",
		chavenfe: "",
		status: "",
	};

export type CampoFiltroColunaNotaFiscalCompra =
	keyof FiltrosColunaNotaFiscalCompraState;

export const COLUNA_PARA_CAMPO_FILTRO_NF_COMPRA: Record<
	string,
	CampoFiltroColunaNotaFiscalCompra
> = {
	numero: "numero",
	serie: "serie",
	razaosocial: "razaosocial",
	emissao: "emissao",
	entradasaida: "entradasaida",
	chavenfe: "chavenfe",
	status: "status",
};

export const COLUNA_PARA_ORDENAR_NF_COMPRA: Record<string, string> = {
	numero: "numero",
	serie: "serie",
	razaosocial: "razaosocial",
	emissao: "emissao",
	entradasaida: "entradasaida",
	valortotalnota: "valortotalnota",
	chavenfe: "chavenfe",
	status: "status",
};

export type ConfigFiltroColunaNotaFiscalCompra = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColuna = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColuna[] = [
	{ id: "numero", label: "Número", visivelPadrao: true },
	{ id: "serie", label: "Série", visivelPadrao: true },
	{ id: "razaosocial", label: "Fornecedor", visivelPadrao: true },
	{ id: "emissao", label: "Emissão", visivelPadrao: true },
	{ id: "entradasaida", label: "Entrada", visivelPadrao: true },
	{ id: "valortotalnota", label: "Valor total", visivelPadrao: true },
	{ id: "chavenfe", label: "Chave NF-e", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasNotaFiscalCompra(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatCurrency(value: string | null | undefined) {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	if (Number.isNaN(num)) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

function formatDate(date: string | null | undefined) {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("pt-BR");
}

function statusBadge(status: number | null | undefined) {
	if (status === STATUS_CANCELADA) {
		return <Badge variant="destructive">Cancelada</Badge>;
	}
	if (status === STATUS_CONFIRMADA) {
		return <Badge className="bg-green-600">Confirmada</Badge>;
	}
	if (status === STATUS_RASCUNHO) {
		return <Badge variant="outline">Rascunho</Badge>;
	}
	if (status === null || status === undefined) {
		return <Badge variant="secondary">Registrada</Badge>;
	}
	return <Badge variant="secondary">{status}</Badge>;
}

export type OpcoesColunasNotaFiscalCompra = {
	filtros: FiltrosColunaNotaFiscalCompraState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaNotaFiscalCompra>;
	onCancelar: (nota: NotaFiscal) => void;
	cancelandoId?: string | null;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasNotaFiscalCompra,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_NF_COMPRA[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_NF_COMPRA[def.id] ?? def.id;
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

export function criarColunasNotaFiscalCompra(
	opcoes: OpcoesColunasNotaFiscalCompra,
): ColumnDef<NotaFiscal>[] {
	const colunas: ColumnDef<NotaFiscal>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				meta,
				cell: ({ row }) => {
					const nota = row.original;
					const cancelada = nota.status === STATUS_CANCELADA;
					const podeEditar = !cancelada && nota.status !== STATUS_RASCUNHO;
					const podeCancelar = !cancelada && nota.status !== STATUS_RASCUNHO;
					const podeDevolver =
						!!nota.chavenfe && !cancelada && nota.status !== STATUS_RASCUNHO;

					return (
						<div className="flex items-center justify-end gap-1">
							{podeEditar && (
								<Button
									asChild
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
								>
									<Link href={`/nota-fiscal-compra/${nota.id}/editar`}>
										<Pencil className="mr-1 size-3" />
										Editar
									</Link>
								</Button>
							)}
							{podeCancelar && (
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs text-destructive border-destructive/30"
									disabled={opcoes.cancelandoId === nota.id}
									onClick={() => opcoes.onCancelar(nota)}
								>
									<Ban className="mr-1 size-3" />
									Cancelar
								</Button>
							)}
							{podeDevolver && (
								<Button
									asChild
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
								>
									<Link
										href={`/nota-fiscal-venda/nova?devolverEntrada=${nota.id}`}
									>
										<RotateCcw className="mr-1 size-3" />
										Devolver
									</Link>
								</Button>
							)}
						</div>
					);
				},
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "numero":
				colunas.push({
					id: "numero",
					accessorKey: "numero",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">
							{row.original.numero ?? row.original.numeronotafiscal ?? "-"}
						</div>
					),
				});
				break;
			case "serie":
				colunas.push({
					id: "serie",
					accessorKey: "serie",
					header,
					meta,
					cell: ({ row }) => <div>{row.getValue("serie") ?? "-"}</div>,
				});
				break;
			case "razaosocial":
				colunas.push({
					id: "razaosocial",
					accessorKey: "razaosocial",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[200px] truncate">
							{row.getValue("razaosocial") ?? "-"}
						</div>
					),
				});
				break;
			case "emissao":
				colunas.push({
					id: "emissao",
					accessorKey: "emissao",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatDate(row.getValue("emissao"))}</div>
					),
				});
				break;
			case "entradasaida":
				colunas.push({
					id: "entradasaida",
					accessorKey: "entradasaida",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatDate(row.getValue("entradasaida"))}</div>
					),
				});
				break;
			case "valortotalnota":
				colunas.push({
					id: "valortotalnota",
					accessorKey: "valortotalnota",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-right font-medium">
							{formatCurrency(row.getValue("valortotalnota"))}
						</div>
					),
				});
				break;
			case "chavenfe":
				colunas.push({
					id: "chavenfe",
					accessorKey: "chavenfe",
					header,
					meta,
					cell: ({ row }) => {
						const chave = row.getValue("chavenfe") as string | null;
						if (!chave) return <div>-</div>;
						return (
							<div className="max-w-[120px] truncate text-xs text-muted-foreground">
								{chave}
							</div>
						);
					},
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					accessorKey: "status",
					header,
					meta,
					cell: ({ row }) =>
						statusBadge(row.getValue("status") as number | null),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
