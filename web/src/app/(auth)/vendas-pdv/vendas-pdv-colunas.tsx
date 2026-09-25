import { IconBan, IconEye, IconFileInvoice } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { StatusNfeBadge } from "@/app/(auth)/nota-fiscal-venda/components/status-nfe-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NFE_STATUS, NFE_STATUS_LABELS } from "@/constants/nfe-status";
import { formatDateTimeBrasilia } from "@/lib/date";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import {
	documentoVenda,
	type FiltrosColunaVendasPdvState,
	idNfceVenda,
	meiosPagamentoVenda,
	nomeOperador,
	podeCancelarVendaNaoFiscal,
	rotuloFiscal,
	rotuloNfce,
	tipoVenda,
} from "./vendas-pdv-helpers";

export type CampoFiltroColunaVendasPdv = keyof FiltrosColunaVendasPdvState;

export const COLUNA_PARA_CAMPO_FILTRO_VENDAS_PDV: Record<
	string,
	CampoFiltroColunaVendasPdv
> = {
	numeropdv: "numeropdv",
	datacriacao: "datacriacao",
	origem: "origem",
	operador: "operador",
	pagamento: "pagamento",
	fiscal: "fiscal",
	nfce: "nfce",
	valortotal: "valortotal",
};

export type ConfigFiltroColunaVendasPdv = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

export const ORIGEM_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "Balcão", label: "Balcão" },
	{ value: "PDV", label: "PDV" },
	{ value: "POS", label: "POS" },
	{ value: "Mesa", label: "Mesa" },
];

export const FISCAL_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "fiscal", label: "Fiscal" },
	{ value: "gerencial", label: "Não fiscal" },
];

export const PAGAMENTO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "Dinheiro", label: "Dinheiro" },
	{ value: "PIX", label: "PIX" },
	{ value: "Cartão", label: "Cartão" },
	{ value: "Cartão crédito", label: "Cartão crédito" },
	{ value: "Cartão débito", label: "Cartão débito" },
	{ value: "Pré-pago", label: "Pré-pago" },
];

export const NFCE_STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "—", label: "Sem NFC-e / não fiscal" },
	{ value: "Sem NFC-e", label: "Sem NFC-e" },
	{
		value: NFE_STATUS_LABELS[NFE_STATUS.PENDENTE],
		label: NFE_STATUS_LABELS[NFE_STATUS.PENDENTE],
	},
	{
		value: NFE_STATUS_LABELS[NFE_STATUS.AUTORIZADA],
		label: NFE_STATUS_LABELS[NFE_STATUS.AUTORIZADA],
	},
	{
		value: NFE_STATUS_LABELS[NFE_STATUS.REJEITADA],
		label: NFE_STATUS_LABELS[NFE_STATUS.REJEITADA],
	},
	{
		value: NFE_STATUS_LABELS[NFE_STATUS.CANCELADA],
		label: NFE_STATUS_LABELS[NFE_STATUS.CANCELADA],
	},
	{
		value: NFE_STATUS_LABELS[NFE_STATUS.INUTILIZADA],
		label: NFE_STATUS_LABELS[NFE_STATUS.INUTILIZADA],
	},
];

type DefinicaoColuna = {
	id: string;
	label: string;
};

const DEFINICOES_COLUNAS: DefinicaoColuna[] = [
	{ id: "numeropdv", label: "Nº PDV" },
	{ id: "datacriacao", label: "Data / Hora" },
	{ id: "origem", label: "Origem" },
	{ id: "operador", label: "Operador" },
	{ id: "pagamento", label: "Pagamento" },
	{ id: "fiscal", label: "Fiscal" },
	{ id: "nfce", label: "NFC-e" },
	{ id: "valortotal", label: "Total" },
	{ id: "acoes", label: "Ações" },
];

export type OpcoesColunasVendasPdv = {
	usuariosPorId: Record<string, string>;
	filtros: FiltrosColunaVendasPdvState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaVendasPdv>;
	onVerItens: (venda: VendaPdvGourmet) => void;
	onVerNfce: (venda: VendaPdvGourmet) => void;
	onCancelarVendaNaoFiscal: (venda: VendaPdvGourmet) => void;
};

function criarHeaderColuna(
	def: DefinicaoColuna,
	opcoes: OpcoesColunasVendasPdv,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_VENDAS_PDV[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === def.id && opcoes.ordem
			? opcoes.ordem
			: false;

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

export function criarColunasVendasPdv(
	opcoes: OpcoesColunasVendasPdv,
): ColumnDef<VendaPdvGourmet>[] {
	const {
		usuariosPorId,
		onVerItens,
		onVerNfce,
		onCancelarVendaNaoFiscal,
	} = opcoes;

	const colunas: ColumnDef<VendaPdvGourmet>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: () => <span className="sr-only">{def.label}</span>,
				enableHiding: false,
				enableSorting: false,
				meta,
				cell: ({ row }) => {
					const venda = row.original;
					const idNfce = idNfceVenda(venda);
					const fiscal = documentoVenda(venda) === "fiscal";
					const podeCancelar = podeCancelarVendaNaoFiscal(venda);
					return (
						<div className="flex justify-end gap-1 whitespace-nowrap">
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => onVerItens(venda)}
							>
								<IconEye className="size-4" aria-hidden="true" />
								Itens
							</Button>
							{fiscal ? (
								<Button
									variant="ghost"
									size="sm"
									className="gap-1.5"
									disabled={!idNfce}
									title={
										idNfce
											? "Consultar NFC-e"
											: "NFC-e ainda não vinculada a esta venda"
									}
									onClick={() => onVerNfce(venda)}
								>
									<IconFileInvoice className="size-4" aria-hidden="true" />
									Consultar
								</Button>
							) : null}
							{podeCancelar ? (
								<Button
									variant="ghost"
									size="sm"
									className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
									title="Cancelar venda sem NFC-e autorizada (sem prazo SEFAZ)"
									onClick={() => onCancelarVendaNaoFiscal(venda)}
								>
									<IconBan className="size-4" aria-hidden="true" />
									Cancelar
								</Button>
							) : null}
						</div>
					);
				},
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "numeropdv":
				colunas.push({
					id: "numeropdv",
					header,
					meta,
					cell: ({ row }) => (
						<span className="font-mono font-medium tabular-nums">
							{row.original.numeropdv}
						</span>
					),
				});
				break;
			case "datacriacao":
				colunas.push({
					id: "datacriacao",
					header,
					meta,
					cell: ({ row }) => {
						const val = row.original.datacriacao;
						if (!val) {
							return <span className="text-muted-foreground">—</span>;
						}
						return (
							<span className="whitespace-nowrap tabular-nums">
								{formatDateTimeBrasilia(val)}
							</span>
						);
					},
				});
				break;
			case "origem":
				colunas.push({
					id: "origem",
					header,
					meta,
					cell: ({ row }) => {
						const tipo = tipoVenda(row.original);
						return (
							<Badge variant={tipo === "Mesa" ? "secondary" : "outline"}>
								{tipo}
							</Badge>
						);
					},
				});
				break;
			case "operador":
				colunas.push({
					id: "operador",
					header,
					meta,
					cell: ({ row }) => (
						<span className="block max-w-[140px] truncate text-sm">
							{nomeOperador(row.original, usuariosPorId)}
						</span>
					),
				});
				break;
			case "pagamento":
				colunas.push({
					id: "pagamento",
					header,
					meta,
					cell: ({ row }) => {
						const meios = meiosPagamentoVenda(row.original);
						if (meios.length === 0) {
							return <span className="text-muted-foreground">—</span>;
						}
						return (
							<div className="flex max-w-[200px] flex-wrap gap-1">
								{meios.map((meio) => (
									<Badge key={meio} variant="outline" className="font-normal">
										{meio}
									</Badge>
								))}
							</div>
						);
					},
				});
				break;
			case "fiscal":
				colunas.push({
					id: "fiscal",
					header,
					meta,
					cell: ({ row }) => {
						const fiscal = rotuloFiscal(row.original) === "Fiscal";
						return (
							<Badge variant={fiscal ? "default" : "secondary"}>
								{fiscal ? "Fiscal" : "Não fiscal"}
							</Badge>
						);
					},
				});
				break;
			case "nfce":
				colunas.push({
					id: "nfce",
					header,
					meta,
					cell: ({ row }) => {
						const venda = row.original;
						if (documentoVenda(venda) !== "fiscal") {
							return <span className="text-muted-foreground">—</span>;
						}
						const status = venda.nfce?.status ?? null;
						const numero = rotuloNfce(venda);
						if (status == null && !idNfceVenda(venda)) {
							return (
								<Badge variant="outline" className="font-normal">
									Sem NFC-e
								</Badge>
							);
						}
						return (
							<div className="flex min-w-[140px] flex-col items-start gap-1">
								<StatusNfeBadge status={status ?? 90} size="sm" />
								{numero ? (
									<span className="font-mono text-xs text-muted-foreground">
										{numero}
									</span>
								) : null}
							</div>
						);
					},
				});
				break;
			case "valortotal":
				colunas.push({
					id: "valortotal",
					header,
					meta,
					cell: ({ row }) => (
						<span className="block whitespace-nowrap text-right font-medium tabular-nums">
							{formatCurrency(row.original.valortotal)}
						</span>
					),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
