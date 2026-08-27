import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { rotuloPagamentoVenda } from "@/lib/pagamento";
import { money } from "@/lib/utils";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/ui/components/cabecalho-coluna-tabela";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";

export type VendaListagem = {
	id: string;
	origem: string;
	meio_pagamento: string;
	valortotal: number;
	valordinheiro?: number;
	valorpix?: number;
	valorcartao?: number;
	criadoem: string;
	sync_status: string;
	nfce_status: string;
};

export type FiltrosColunaVendasState = {
	criadoem: string;
	origem: string;
	pagamento: string;
	sync_status: string;
	nfce_status: string;
};

export const filtrosColunaVendasVazios: FiltrosColunaVendasState = {
	criadoem: "",
	origem: "",
	pagamento: "",
	sync_status: "",
	nfce_status: "",
};

export type CampoFiltroColunaVendas = keyof FiltrosColunaVendasState;

export const COLUNA_PARA_CAMPO_FILTRO_VENDAS: Record<
	string,
	CampoFiltroColunaVendas
> = {
	criadoem: "criadoem",
	origem: "origem",
	pagamento: "pagamento",
	sync_status: "sync_status",
	nfce_status: "nfce_status",
};

export const COLUNA_PARA_ORDENAR_VENDAS: Record<string, string> = {
	criadoem: "criadoem",
	origem: "origem",
	pagamento: "meio_pagamento",
	valortotal: "valortotal",
	sync_status: "sync_status",
	nfce_status: "nfce_status",
};

export type ConfigFiltroColunaVendas = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

export const ORIGEM_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "rapida", label: "Balcão" },
	{ value: "mesa", label: "Mesa" },
	{ value: "delivery", label: "Delivery" },
	{ value: "retirada", label: "Retirada" },
];

export const PAGAMENTO_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "DINHEIRO", label: "Dinheiro" },
	{ value: "PIX", label: "PIX" },
	{ value: "CARTAO", label: "Cartão" },
	{ value: "MISTO", label: "Misto" },
	{ value: "OUTROS", label: "Outros" },
];

export const SYNC_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "sincronizado", label: "Sincronizado" },
	{ value: "pendente", label: "Pendente" },
];

export const NFCE_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "autorizada", label: "Autorizada" },
	{ value: "transmitida", label: "Enviada (aguardando SEFAZ)" },
	{ value: "pendente", label: "Pendente" },
	{ value: "contingencia", label: "Contingência" },
	{ value: "erro", label: "Rejeitada" },
	{ value: "erro_config", label: "Erro config" },
	{ value: "inutilizada", label: "Inutilizada" },
	{ value: "cancelada", label: "Cancelada" },
	{ value: "nao_fiscal", label: "Não fiscal" },
	{ value: "nenhuma", label: "Nenhuma" },
];

type DefinicaoColuna = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColuna[] = [
	{ id: "criadoem", label: "Data", visivelPadrao: true },
	{ id: "origem", label: "Origem", visivelPadrao: true },
	{ id: "pagamento", label: "Pagamento", visivelPadrao: true },
	{ id: "valortotal", label: "Total", visivelPadrao: true },
	{ id: "sync_status", label: "Sync", visivelPadrao: true },
	{ id: "nfce_status", label: "NFC-e", visivelPadrao: true },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasVendas(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export function rotuloColunaVendas(column: {
	id: string;
	columnDef: { meta?: unknown; header?: unknown };
}) {
	const meta = column.columnDef.meta as { label?: string } | undefined;
	if (meta?.label) return meta.label;
	if (typeof column.columnDef.header === "string") {
		return column.columnDef.header;
	}
	return column.id;
}

function badgeSync(status: string) {
	if (status === "sincronizado") return "success" as const;
	if (status === "pendente") return "warning" as const;
	return "outline" as const;
}

function badgeNfce(status: string) {
	if (status === "autorizada") return "success" as const;
	if (status === "transmitida") return "warning" as const;
	if (
		status === "contingencia" ||
		status === "pendente_contingencia" ||
		status === "pendente"
	)
		return "warning" as const;
	if (status === "erro" || status === "erro_config" || status === "cancelada")
		return "destructive" as const;
	return "outline" as const;
}

function rotuloNfce(status: string) {
	if (status === "erro") return "rejeitada";
	if (status === "erro_config") return "erro config";
	if (status === "pendente_contingencia" || status === "pendente")
		return "pendente";
	if (status === "transmitida") return "enviada (aguardando SEFAZ)";
	if (status === "inutilizada") return "inutilizada";
	if (status === "cancelada") return "cancelada";
	return status;
}

function rotuloOrigem(origem: string) {
	if (origem === "rapida") return "Balcão";
	if (origem === "mesa") return "Mesa";
	if (origem === "delivery") return "Delivery";
	if (origem === "retirada") return "Retirada";
	return origem;
}

function podeRetransmitir(status: string) {
	return (
		status === "erro" ||
		status === "erro_config" ||
		status === "contingencia" ||
		status === "pendente_contingencia" ||
		status === "inutilizada"
	);
}

function podeInutilizar(status: string) {
	return status === "erro";
}

function chavePagamento(venda: VendaListagem): string {
	const partes: string[] = [];
	if ((Number(venda.valordinheiro) || 0) > 0.009) partes.push("DINHEIRO");
	if ((Number(venda.valorpix) || 0) > 0.009) partes.push("PIX");
	if ((Number(venda.valorcartao) || 0) > 0.009) partes.push("CARTAO");
	if (partes.length > 1) return "MISTO";
	if (partes.length === 1) return partes[0];
	const meio = String(venda.meio_pagamento ?? "").toUpperCase();
	if (meio === "MISTO" || meio === "CARTAO" || meio === "PIX" || meio === "DINHEIRO" || meio === "OUTROS") {
		return meio;
	}
	return "OUTROS";
}

export function filtrarVendas(
	vendas: VendaListagem[],
	filtros: FiltrosColunaVendasState,
): VendaListagem[] {
	return vendas.filter((venda) => {
		if (filtros.criadoem) {
			const dia = dayjs(venda.criadoem).format("YYYY-MM-DD");
			if (dia !== filtros.criadoem) return false;
		}
		if (filtros.origem && venda.origem !== filtros.origem) return false;
		if (filtros.pagamento && chavePagamento(venda) !== filtros.pagamento) {
			return false;
		}
		if (filtros.sync_status && venda.sync_status !== filtros.sync_status) {
			return false;
		}
		if (filtros.nfce_status) {
			const status = venda.nfce_status;
			if (filtros.nfce_status === "pendente") {
				if (status !== "pendente" && status !== "pendente_contingencia") {
					return false;
				}
			} else if (filtros.nfce_status === "contingencia") {
				if (status !== "contingencia" && status !== "pendente_contingencia") {
					return false;
				}
			} else if (status !== filtros.nfce_status) {
				return false;
			}
		}
		return true;
	});
}

export function ordenarVendas(
	vendas: VendaListagem[],
	ordenarPor: string | null,
	ordem: "asc" | "desc" | null,
): VendaListagem[] {
	if (!ordenarPor || !ordem) return vendas;
	const fator = ordem === "asc" ? 1 : -1;
	return [...vendas].sort((a, b) => {
		let va: string | number = "";
		let vb: string | number = "";
		switch (ordenarPor) {
			case "criadoem":
				va = new Date(a.criadoem).getTime();
				vb = new Date(b.criadoem).getTime();
				break;
			case "origem":
				va = a.origem;
				vb = b.origem;
				break;
			case "meio_pagamento":
				va = rotuloPagamentoVenda(a);
				vb = rotuloPagamentoVenda(b);
				break;
			case "valortotal":
				va = a.valortotal;
				vb = b.valortotal;
				break;
			case "sync_status":
				va = a.sync_status;
				vb = b.sync_status;
				break;
			case "nfce_status":
				va = a.nfce_status;
				vb = b.nfce_status;
				break;
			default:
				return 0;
		}
		if (typeof va === "number" && typeof vb === "number") {
			return (va - vb) * fator;
		}
		return String(va).localeCompare(String(vb), "pt-BR") * fator;
	});
}

export type OpcoesColunasVendas = {
	filtros: FiltrosColunaVendasState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaVendas>;
	retransmitindoId: string | null;
	onRetransmitir: (id: string) => void;
	onInutilizar: (id: string) => void;
	onReimprimir: (id: string) => void;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasVendas,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_VENDAS[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_VENDAS[def.id] ?? def.id;
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

export function criarColunasVendas(
	opcoes: OpcoesColunasVendas,
): ColumnDef<VendaListagem>[] {
	const colunas: ColumnDef<VendaListagem>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				meta,
				cell: ({ row }) => {
					const v = row.original;
					return (
						<div className="flex justify-end gap-1">
							{podeRetransmitir(v.nfce_status) ? (
								<Button
									size="sm"
									variant="outline"
									disabled={opcoes.retransmitindoId === v.id}
									onClick={() => opcoes.onRetransmitir(v.id)}
								>
									{opcoes.retransmitindoId === v.id
										? "Enviando…"
										: "Retransmitir"}
								</Button>
							) : null}
							{podeInutilizar(v.nfce_status) ? (
								<Button
									size="sm"
									variant="outline"
									disabled={opcoes.retransmitindoId === v.id}
									onClick={() => opcoes.onInutilizar(v.id)}
								>
									Inutilizar
								</Button>
							) : null}
							<Button
								size="sm"
								variant="ghost"
								onClick={() => opcoes.onReimprimir(v.id)}
							>
								Reimprimir
							</Button>
						</div>
					);
				},
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "criadoem":
				colunas.push({
					id: "criadoem",
					header,
					meta,
					cell: ({ row }) =>
						dayjs(row.original.criadoem).format("DD/MM/YYYY HH:mm:ss"),
				});
				break;
			case "origem":
				colunas.push({
					id: "origem",
					header,
					meta,
					cell: ({ row }) => rotuloOrigem(row.original.origem),
				});
				break;
			case "pagamento":
				colunas.push({
					id: "pagamento",
					header,
					meta,
					cell: ({ row }) => rotuloPagamentoVenda(row.original),
				});
				break;
			case "valortotal":
				colunas.push({
					id: "valortotal",
					header,
					meta,
					cell: ({ row }) => (
						<span className="font-medium">{money(row.original.valortotal)}</span>
					),
				});
				break;
			case "sync_status":
				colunas.push({
					id: "sync_status",
					header,
					meta,
					cell: ({ row }) => (
						<Badge variant={badgeSync(row.original.sync_status)}>
							{row.original.sync_status}
						</Badge>
					),
				});
				break;
			case "nfce_status":
				colunas.push({
					id: "nfce_status",
					header,
					meta,
					cell: ({ row }) => (
						<Badge variant={badgeNfce(row.original.nfce_status)}>
							{rotuloNfce(row.original.nfce_status)}
						</Badge>
					),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
