import { IconDotsVertical } from "@tabler/icons-react";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import {
	Ban,
	Copy,
	Eye,
	Pencil,
	RefreshCw,
	Search,
} from "lucide-react";
import Link from "next/link";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NFE_STATUS, NFE_STATUS_LABELS } from "@/constants/nfe-status";
import { maskCpfCnpj } from "@/lib/masks";
import type { NotaFiscalServico } from "@/services/nfse-emissao.service";

export const NFSE_STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] =
	Object.entries(NFE_STATUS_LABELS).map(([value, label]) => ({
		value,
		label,
	}));

export type FiltrosColunaNotaFiscalServicoState = {
	numero: string;
	numeronfse: string;
	razaosocial: string;
	emissao: string;
	status: string;
};

export const filtrosColunaNotaFiscalServicoVazios: FiltrosColunaNotaFiscalServicoState =
	{
		numero: "",
		numeronfse: "",
		razaosocial: "",
		emissao: "",
		status: "",
	};

export type CampoFiltroColunaNotaFiscalServico =
	keyof FiltrosColunaNotaFiscalServicoState;

export const COLUNA_PARA_CAMPO_FILTRO_NF_SERVICO: Record<
	string,
	CampoFiltroColunaNotaFiscalServico
> = {
	numeronotafiscal: "numero",
	numeronfse: "numeronfse",
	razaosocial: "razaosocial",
	dataEmissao: "emissao",
	status: "status",
};

export const COLUNA_PARA_ORDENAR_NF_SERVICO: Record<string, string> = {
	numeronotafiscal: "numeronotafiscal",
	numeronfse: "numeronfse",
	razaosocial: "razaosocial",
	dataEmissao: "emissao",
	valortotalnota: "valortotalnota",
	status: "status",
};

export type ConfigFiltroColunaNotaFiscalServico = {
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
	{ id: "numeronotafiscal", label: "RPS", visivelPadrao: true },
	{ id: "numeronfse", label: "NFS-e", visivelPadrao: true },
	{ id: "razaosocial", label: "Tomador", visivelPadrao: true },
	{ id: "dataEmissao", label: "Data", visivelPadrao: true },
	{ id: "valortotalnota", label: "Total", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasNotaFiscalServico(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatCurrency(value: string | null | undefined) {
	if (!value) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(parseFloat(value));
}

function formatDateTime(date: string | null | undefined) {
	if (!date) return "-";
	return new Date(date).toLocaleString("pt-BR");
}

function notaPodeEditarOuRetransmitir(nota: NotaFiscalServico) {
	return (
		nota.status === NFE_STATUS.PENDENTE || nota.status === NFE_STATUS.REJEITADA
	);
}

function notaPodeCancelar(nota: NotaFiscalServico) {
	if (nota.status !== NFE_STATUS.AUTORIZADA) return false;
	const eventoPendente = Boolean(
		nota.dadosimportacao?.protocoloCancelamento ||
			nota.dadosimportacao?.protocoloSubstituicao,
	);
	return !eventoPendente;
}

function notaPodeConsultar(nota: NotaFiscalServico) {
	return nota.status !== NFE_STATUS.CANCELADA;
}

export type OpcoesColunasNotaFiscalServico = {
	filtros: FiltrosColunaNotaFiscalServicoState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaNotaFiscalServico>;
	onConsultar: (nota: NotaFiscalServico) => void;
	onRetransmitir: (nota: NotaFiscalServico) => void;
	onCancelar: (nota: NotaFiscalServico) => void;
	acoesOcupadas: boolean;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasNotaFiscalServico,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_NF_SERVICO[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_NF_SERVICO[def.id] ?? def.id;
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

export function criarColunasNotaFiscalServico(
	opcoes: OpcoesColunasNotaFiscalServico,
): ColumnDef<NotaFiscalServico>[] {
	const colunas: ColumnDef<NotaFiscalServico>[] = [];

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
					const podeEditar = notaPodeEditarOuRetransmitir(nota);
					const podeCancelar = notaPodeCancelar(nota);
					const podeConsultar = notaPodeConsultar(nota);

					return (
						<div className="flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										aria-label="Abrir menu de ações"
										disabled={opcoes.acoesOcupadas}
									>
										<IconDotsVertical className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem asChild>
										<Link href={`/nota-fiscal-servico/${nota.id}`}>
											<Eye className="size-4" />
											Ver
										</Link>
									</DropdownMenuItem>
									{podeConsultar ? (
										<DropdownMenuItem
											onClick={() => opcoes.onConsultar(nota)}
										>
											<Search className="size-4" />
											Consultar
										</DropdownMenuItem>
									) : null}
									{podeEditar ? (
										<DropdownMenuItem asChild>
											<Link
												href={`/nota-fiscal-servico/nova?origem=${nota.id}`}
											>
												<Pencil className="size-4" />
												Editar
											</Link>
										</DropdownMenuItem>
									) : null}
									{podeEditar ? (
										<DropdownMenuItem
											onClick={() => opcoes.onRetransmitir(nota)}
										>
											<RefreshCw className="size-4" />
											Retransmitir
										</DropdownMenuItem>
									) : null}
									<DropdownMenuItem asChild>
										<Link
											href={`/nota-fiscal-servico/nova?origem=${nota.id}`}
										>
											<Copy className="size-4" />
											Duplicar
										</Link>
									</DropdownMenuItem>
									{podeCancelar ? (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => opcoes.onCancelar(nota)}
											>
												<Ban className="size-4" />
												Cancelar
											</DropdownMenuItem>
										</>
									) : null}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
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
						<Link
							href={`/nota-fiscal-servico/${row.original.id}`}
							className="font-medium hover:underline"
						>
							{row.original.serie}-{row.original.numeronotafiscal}
						</Link>
					),
				});
				break;
			case "numeronfse":
				colunas.push({
					id: "numeronfse",
					accessorKey: "numeronfse",
					header,
					meta,
					cell: ({ row }) => row.original.numeronfse ?? "—",
				});
				break;
			case "razaosocial":
				colunas.push({
					id: "razaosocial",
					accessorKey: "razaosocial",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[240px]">
							<div className="truncate font-medium">
								{row.original.razaosocial ?? "—"}
							</div>
							{row.original.cnpjcpf ? (
								<div className="truncate text-xs text-muted-foreground font-mono">
									{maskCpfCnpj(row.original.cnpjcpf)}
								</div>
							) : null}
						</div>
					),
				});
				break;
			case "dataEmissao":
				colunas.push({
					id: "dataEmissao",
					header,
					meta,
					cell: ({ row }) =>
						formatDateTime(
							row.original.emissao ?? row.original.datahoraemissao,
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
						<div className="text-right">
							{formatCurrency(row.original.valortotalnota)}
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
					cell: ({ row }) =>
						NFE_STATUS_LABELS[row.original.status ?? 90] ??
						row.original.status,
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
