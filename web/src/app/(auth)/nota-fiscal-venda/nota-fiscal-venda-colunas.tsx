import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { Ban, Copy, FileX2, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Button } from "@/components/ui/button";
import {
	NFE_AMBIENTE_LABELS,
	NFE_STATUS,
	NFE_STATUS_LABELS,
} from "@/constants/nfe-status";
import type { NotaFiscalEmitida } from "@/services/nfe-emissao.service";
import {
	obterCodigoRejeicaoNota,
	obterMotivoRejeicaoNota,
} from "@/util/nfe-rejeicao-util";
import {
	notaPodeSerCancelada,
	notaPodeSerInutilizada,
} from "@/util/validar-eventos-nfe";
import { StatusNfeBadge } from "./components/status-nfe-badge";

export const NFE_STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] =
	Object.entries(NFE_STATUS_LABELS).map(([value, label]) => ({
		value,
		label,
	}));

export type FiltrosColunaNotaFiscalProdutoState = {
	numero: string;
	razaosocial: string;
	emissao: string;
	status: string;
	chavenfe: string;
};

export const filtrosColunaNotaFiscalProdutoVazios: FiltrosColunaNotaFiscalProdutoState =
	{
		numero: "",
		razaosocial: "",
		emissao: "",
		status: "",
		chavenfe: "",
	};

export type CampoFiltroColunaNotaFiscalProduto =
	keyof FiltrosColunaNotaFiscalProdutoState;

export const COLUNA_PARA_CAMPO_FILTRO_NF_PRODUTO: Record<
	string,
	CampoFiltroColunaNotaFiscalProduto
> = {
	numeronotafiscal: "numero",
	razaosocial: "razaosocial",
	dataEmissao: "emissao",
	status: "status",
	chavenfe: "chavenfe",
};

export const COLUNA_PARA_ORDENAR_NF_PRODUTO: Record<string, string> = {
	numeronotafiscal: "numeronotafiscal",
	razaosocial: "razaosocial",
	dataEmissao: "emissao",
	valortotalnota: "valortotalnota",
	tipoambientenfe: "tipoambientenfe",
	status: "status",
	chavenfe: "chavenfe",
};

export type ConfigFiltroColunaNotaFiscalProduto = {
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
	{ id: "numeronotafiscal", label: "Nº", visivelPadrao: true },
	{ id: "razaosocial", label: "Destinatário", visivelPadrao: true },
	{ id: "dataEmissao", label: "Data", visivelPadrao: true },
	{ id: "valortotalnota", label: "Total", visivelPadrao: true },
	{ id: "tipoambientenfe", label: "Ambiente", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "chavenfe", label: "Chave", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasNotaFiscalProduto(): VisibilityState {
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
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

function formatDateTime(date: string | null | undefined) {
	if (!date) return "-";
	try {
		return new Date(date).toLocaleString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return date;
	}
}

function obterDataExibicao(nota: NotaFiscalEmitida) {
	return nota.emissao ?? nota.datahoraemissao ?? nota.datainclusao;
}

export type OpcoesColunasNotaFiscalProduto = {
	filtros: FiltrosColunaNotaFiscalProdutoState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaNotaFiscalProduto>;
	onCancelar: (nota: NotaFiscalEmitida) => void;
	onInutilizar: (nota: NotaFiscalEmitida) => void;
	renderAcoes?: (nota: NotaFiscalEmitida) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasNotaFiscalProduto,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_NF_PRODUTO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_NF_PRODUTO[def.id] ?? def.id;
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

function renderAcoesPadrao(
	nota: NotaFiscalEmitida,
	opcoes: OpcoesColunasNotaFiscalProduto,
) {
	const podeTransmitir =
		nota.status === NFE_STATUS.PENDENTE ||
		nota.status === NFE_STATUS.REJEITADA;
	const podeDevolver =
		nota.status === NFE_STATUS.AUTORIZADA && !!nota.chavenfe;
	const podeClonar =
		nota.status === NFE_STATUS.AUTORIZADA ||
		nota.status === NFE_STATUS.CANCELADA ||
		nota.status === NFE_STATUS.CANCELADA_FORA_PRAZO ||
		nota.status === NFE_STATUS.REJEITADA ||
		nota.status === NFE_STATUS.PENDENTE;
	const podeCancelar = notaPodeSerCancelada(nota).permitido;
	const podeInutilizar = notaPodeSerInutilizada(nota).permitido;

	return (
		<div className="flex items-center gap-1">
			{podeCancelar && (
				<Button
					size="sm"
					variant="outline"
					className="h-7 px-2 text-xs text-destructive border-destructive/30"
					onClick={(e) => {
						e.stopPropagation();
						opcoes.onCancelar(nota);
					}}
				>
					<Ban className="mr-1 size-3" />
					Cancelar
				</Button>
			)}
			{podeInutilizar && (
				<Button
					size="sm"
					variant="outline"
					className="h-7 px-2 text-xs"
					onClick={(e) => {
						e.stopPropagation();
						opcoes.onInutilizar(nota);
					}}
				>
					<FileX2 className="mr-1 size-3" />
					Inutilizar
				</Button>
			)}
			{podeDevolver && (
				<Link href={`/nota-fiscal-venda/nova?devolverVenda=${nota.id}`}>
					<Button size="sm" variant="outline" className="h-7 px-2 text-xs">
						<RotateCcw className="mr-1 size-3" />
						Devolver
					</Button>
				</Link>
			)}
			{podeClonar && (
				<Link href={`/nota-fiscal-venda/nova?clonar=${nota.id}`}>
					<Button size="sm" variant="outline" className="h-7 px-2 text-xs">
						<Copy className="mr-1 size-3" />
						Clonar
					</Button>
				</Link>
			)}
			{podeTransmitir && (
				<Link href={`/nota-fiscal-venda/${nota.id}`}>
					<Button size="sm" className="h-7 px-2 text-xs">
						Transmitir
					</Button>
				</Link>
			)}
			<Link href={`/nota-fiscal-venda/${nota.id}`}>
				<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
					Ver
				</Button>
			</Link>
		</div>
	);
}

export function criarColunasNotaFiscalProduto(
	opcoes: OpcoesColunasNotaFiscalProduto,
): ColumnDef<NotaFiscalEmitida>[] {
	const colunas: ColumnDef<NotaFiscalEmitida>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				cell: ({ row }) =>
					opcoes.renderAcoes
						? opcoes.renderAcoes(row.original)
						: renderAcoesPadrao(row.original, opcoes),
				meta,
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "numeronotafiscal":
				colunas.push({
					id: "numeronotafiscal",
					accessorKey: "numeronotafiscal",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">
							{row.original.serie}-{row.getValue("numeronotafiscal") || "—"}
						</div>
					),
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
							{row.getValue("razaosocial") || "Consumidor Final"}
						</div>
					),
				});
				break;
			case "dataEmissao":
				colunas.push({
					id: "dataEmissao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="whitespace-nowrap text-sm">
							{formatDateTime(obterDataExibicao(row.original))}
						</div>
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
			case "tipoambientenfe":
				colunas.push({
					id: "tipoambientenfe",
					accessorKey: "tipoambientenfe",
					header,
					meta,
					cell: ({ row }) => {
						const amb = row.getValue("tipoambientenfe") as number | null;
						if (!amb)
							return (
								<span className="text-muted-foreground text-sm">—</span>
							);
						return (
							<span
								className={
									amb === 2
										? "text-yellow-700 text-xs font-medium"
										: "text-red-700 text-xs font-medium"
								}
							>
								{NFE_AMBIENTE_LABELS[amb] ?? amb}
							</span>
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
					cell: ({ row }) => {
						const nota = row.original;
						const rejeitada = nota.status === NFE_STATUS.REJEITADA;
						const motivo = obterMotivoRejeicaoNota(nota);
						const codigo = obterCodigoRejeicaoNota(nota);

						return (
							<div className="flex max-w-[280px] flex-col gap-1">
								<StatusNfeBadge
									status={nota.status}
									cStat={codigo}
									xMotivo={motivo}
									size="sm"
								/>
								{rejeitada && (codigo || motivo) && (
									<p
										className="text-xs leading-snug text-red-700 line-clamp-3"
										title={[codigo, motivo].filter(Boolean).join(" — ")}
									>
										{codigo ? `Cód. ${codigo}` : "Rejeição"}
										{codigo && motivo ? ": " : ""}
										{motivo ?? ""}
									</p>
								)}
							</div>
						);
					},
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
						if (!chave)
							return (
								<span className="text-muted-foreground text-sm">—</span>
							);
						return (
							<span
								className="font-mono text-xs text-muted-foreground"
								title={chave}
							>
								{chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}
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
