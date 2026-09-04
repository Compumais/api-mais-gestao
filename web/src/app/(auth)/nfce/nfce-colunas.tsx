import {
	IconEye,
	IconPencil,
	IconPrinter,
	IconRefresh,
} from "@tabler/icons-react";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Ban, FileX2 } from "lucide-react";
import Link from "next/link";
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
import { formatCurrency } from "@/lib/gourmet-utils";
import type { NfceListagem } from "@/services/nfce.service";
import type { NotaFiscalEmitida } from "@/services/nfe-emissao.service";
import {
	obterCodigoRejeicaoNota,
	obterMotivoRejeicaoNota,
} from "@/util/nfe-rejeicao-util";
import {
	notaPodeSerCancelada,
	notaPodeSerInutilizada,
} from "@/util/validar-eventos-nfe";
import { StatusNfeBadge } from "../nota-fiscal-venda/components/status-nfe-badge";

export const NFCE_STATUS_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{
		value: String(NFE_STATUS.PENDENTE),
		label: NFE_STATUS_LABELS[NFE_STATUS.PENDENTE],
	},
	{
		value: String(NFE_STATUS.AUTORIZADA),
		label: NFE_STATUS_LABELS[NFE_STATUS.AUTORIZADA],
	},
	{
		value: String(NFE_STATUS.REJEITADA),
		label: NFE_STATUS_LABELS[NFE_STATUS.REJEITADA],
	},
	{
		value: String(NFE_STATUS.CANCELADA),
		label: NFE_STATUS_LABELS[NFE_STATUS.CANCELADA],
	},
	{
		value: String(NFE_STATUS.INUTILIZADA),
		label: NFE_STATUS_LABELS[NFE_STATUS.INUTILIZADA],
	},
	{
		value: String(NFE_STATUS.DENEGADA),
		label: NFE_STATUS_LABELS[NFE_STATUS.DENEGADA],
	},
];

export type FiltrosColunaNfceState = {
	emissao: string;
	numero: string;
	idvenda: string;
	status: string;
	chavenfe: string;
};

export const filtrosColunaNfceVazios: FiltrosColunaNfceState = {
	emissao: "",
	numero: "",
	idvenda: "",
	status: "",
	chavenfe: "",
};

export type CampoFiltroColunaNfce = keyof FiltrosColunaNfceState;

export const COLUNA_PARA_CAMPO_FILTRO_NFCE: Record<
	string,
	CampoFiltroColunaNfce
> = {
	dataEmissao: "emissao",
	numeronotafiscal: "numero",
	idvenda: "idvenda",
	status: "status",
	chavenfe: "chavenfe",
};

export const COLUNA_PARA_ORDENAR_NFCE: Record<string, string> = {
	dataEmissao: "datahoraemissao",
	numeronotafiscal: "numeronotafiscal",
	idvenda: "idvenda",
	valortotalnota: "valortotalnota",
	status: "status",
	tipoambientenfe: "tipoambientenfe",
	chavenfe: "chavenfe",
};

export type ConfigFiltroColunaNfce = {
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
	{ id: "dataEmissao", label: "Data", visivelPadrao: true },
	{ id: "numeronotafiscal", label: "Número", visivelPadrao: true },
	{ id: "idvenda", label: "Venda PDV", visivelPadrao: true },
	{ id: "valortotalnota", label: "Valor", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "tipoambientenfe", label: "Ambiente", visivelPadrao: true },
	{ id: "chavenfe", label: "Chave", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasNfce(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function paraNotaFiscalEmitida(nota: NfceListagem): NotaFiscalEmitida {
	return {
		id: nota.idnotafiscal,
		idempresa: "",
		numeronotafiscal: nota.numeronotafiscal,
		serie: nota.serie,
		chavenfe: nota.chavenfe,
		protocolonfe: nota.protocolonfe,
		status: nota.status,
		tipoambientenfe: nota.tipoambientenfe,
		valortotalnota: nota.valortotalnota,
		emissao: nota.emissao,
		datahoraemissao: nota.datahoraemissao,
		mensagemtransmissaonfe: nota.mensagemtransmissaonfe,
		codigostatusprotocolonfe: nota.codigostatusprotocolonfe,
	};
}

function formatarValor(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "R$ 0,00";
	return formatCurrency(n);
}

function obterDataExibicao(nota: NfceListagem) {
	return nota.datahoraemissao ?? nota.emissao ?? nota.datainclusao;
}

export type OpcoesColunasNfce = {
	filtros: FiltrosColunaNfceState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaNfce>;
	reemitindoId: string | null;
	carregandoCupomId: string | null;
	onRetransmitir: (idnotafiscal: string) => void;
	onImprimir: (idnotafiscal: string) => void;
	onVerDetalhes: (idnotafiscal: string) => void;
	onCancelar: (nota: NfceListagem) => void;
	onInutilizar: (nota: NfceListagem) => void;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasNfce,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_NFCE[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_NFCE[def.id] ?? def.id;
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === ordenacaoCampo && opcoes.ordem ? opcoes.ordem : false;

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

export function criarColunasNfce(
	opcoes: OpcoesColunasNfce,
): ColumnDef<NfceListagem>[] {
	const colunas: ColumnDef<NfceListagem>[] = [];

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
					const notaEmitida = paraNotaFiscalEmitida(nota);
					const podeReemitir =
						nota.status === NFE_STATUS.PENDENTE ||
						nota.status === NFE_STATUS.REJEITADA ||
						nota.status === NFE_STATUS.DENEGADA;
					const podeAlterar = podeReemitir;
					const podeImprimir = nota.status === NFE_STATUS.AUTORIZADA;
					const podeCancelar = notaPodeSerCancelada(notaEmitida).permitido;
					const podeInutilizar = notaPodeSerInutilizada(notaEmitida).permitido;

					return (
						<div className="flex flex-wrap items-center justify-end gap-1">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => opcoes.onVerDetalhes(nota.idnotafiscal)}
							>
								<IconEye className="size-4" />
								Ver detalhes
							</Button>
							{podeAlterar && (
								<Button type="button" size="sm" variant="outline" asChild>
									<Link href={`/nfce/editar?editarNfce=${nota.idnotafiscal}`}>
										<IconPencil className="size-4" />
										Alterar
									</Link>
								</Button>
							)}
							{podeReemitir && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={opcoes.reemitindoId === nota.idnotafiscal}
									onClick={() => opcoes.onRetransmitir(nota.idnotafiscal)}
								>
									<IconRefresh className="size-4" />
									{opcoes.reemitindoId === nota.idnotafiscal
										? "Enviando..."
										: "Retransmitir"}
								</Button>
							)}
							{podeImprimir && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={opcoes.carregandoCupomId === nota.idnotafiscal}
									onClick={() => opcoes.onImprimir(nota.idnotafiscal)}
								>
									<IconPrinter className="size-4" />
									{opcoes.carregandoCupomId === nota.idnotafiscal
										? "Carregando..."
										: "Imprimir"}
								</Button>
							)}
							{podeCancelar && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="text-destructive"
									onClick={() => opcoes.onCancelar(nota)}
								>
									<Ban className="size-4" />
									Cancelar
								</Button>
							)}
							{podeInutilizar && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => opcoes.onInutilizar(nota)}
								>
									<FileX2 className="size-4" />
									Inutilizar
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
			case "dataEmissao":
				colunas.push({
					id: "dataEmissao",
					header,
					meta,
					cell: ({ row }) => {
						const data = obterDataExibicao(row.original);
						return data ? dayjs(data).format("DD/MM/YYYY HH:mm") : "—";
					},
				});
				break;
			case "numeronotafiscal":
				colunas.push({
					id: "numeronotafiscal",
					accessorKey: "numeronotafiscal",
					header,
					meta,
					cell: ({ row }) => {
						const { numeronotafiscal, serie } = row.original;
						if (!numeronotafiscal) return "—";
						return serie ? `${numeronotafiscal}/${serie}` : numeronotafiscal;
					},
				});
				break;
			case "idvenda":
				colunas.push({
					id: "idvenda",
					accessorKey: "idvenda",
					header,
					meta,
					cell: ({ row }) =>
						row.original.idvenda ? row.original.idvenda.slice(0, 8) : "—",
				});
				break;
			case "valortotalnota":
				colunas.push({
					id: "valortotalnota",
					accessorKey: "valortotalnota",
					header,
					meta,
					cell: ({ row }) => formatarValor(row.original.valortotalnota),
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					accessorKey: "status",
					header,
					meta,
					cell: ({ row }) => {
						const nota = paraNotaFiscalEmitida(row.original);
						return (
							<StatusNfeBadge
								status={nota.status}
								cStat={obterCodigoRejeicaoNota(nota)}
								xMotivo={obterMotivoRejeicaoNota(nota)}
								size="sm"
							/>
						);
					},
				});
				break;
			case "tipoambientenfe":
				colunas.push({
					id: "tipoambientenfe",
					accessorKey: "tipoambientenfe",
					header,
					meta,
					cell: ({ row }) => {
						const ambiente = row.original.tipoambientenfe;
						if (ambiente == null) return "—";
						return NFE_AMBIENTE_LABELS[ambiente] ?? ambiente;
					},
				});
				break;
			case "chavenfe":
				colunas.push({
					id: "chavenfe",
					accessorKey: "chavenfe",
					header,
					meta,
					cell: ({ row }) =>
						row.original.chavenfe ? (
							<span className="font-mono text-xs">
								{row.original.chavenfe.slice(-8)}
							</span>
						) : (
							"—"
						),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
