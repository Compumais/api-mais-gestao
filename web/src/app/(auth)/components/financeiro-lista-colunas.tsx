import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	extrairPeriodoFiltro,
	formatDataCivilBrasilia,
} from "@/lib/date";
import {
	ehTituloPagoSemRastreio,
	ehTituloParcial,
	type Financeiro,
	type ListarFinanceirosParams,
} from "@/services/financeiro.service";

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
	tipodocumentodescricao: string;
	idtipocobranca: string;
	emitente: string;
	status: string;
	emissao: string;
	vencimento: string;
	vencimentooriginal: string;
	ultimopagamento: string;
	baixa: string;
	datareferencia: string;
	entrada: string;
	planocontasnome: string;
	nossonumero: string;
	historico: string;
};

export const filtrosColunaFinanceiroVazios: FiltrosColunaFinanceiroState = {
	documento: "",
	tipodocumentodescricao: "",
	idtipocobranca: "",
	emitente: "",
	status: "",
	emissao: "",
	vencimento: "",
	vencimentooriginal: "",
	ultimopagamento: "",
	baixa: "",
	datareferencia: "",
	entrada: "",
	planocontasnome: "",
	nossonumero: "",
	historico: "",
};

export type CampoFiltroColunaFinanceiro = keyof FiltrosColunaFinanceiroState;

export const COLUNA_PARA_CAMPO_FILTRO_FINANCEIRO: Record<
	string,
	CampoFiltroColunaFinanceiro
> = {
	documento: "documento",
	tipodocumento: "tipodocumentodescricao",
	cobranca: "idtipocobranca",
	emitente: "emitente",
	status: "status",
	emissao: "emissao",
	vencimento: "vencimento",
	vencimentooriginal: "vencimentooriginal",
	ultimopagamento: "ultimopagamento",
	baixa: "baixa",
	datareferencia: "datareferencia",
	entrada: "entrada",
	planocontas: "planocontasnome",
	nossonumero: "nossonumero",
	historico: "historico",
};

export const COLUNA_PARA_ORDENAR_FINANCEIRO: Record<string, string> = {
	documento: "documento",
	tipodocumento: "tipodocumentodescricao",
	emitente: "emitente",
	parcela: "parcela",
	status: "status",
	emissao: "emissao",
	vencimento: "vencimento",
	vencimentooriginal: "vencimentooriginal",
	ultimopagamento: "ultimopagamento",
	baixa: "baixa",
	datareferencia: "datareferencia",
	entrada: "entrada",
	valor: "valor",
	saldo: "saldo",
	valorpagorecebido: "valorpagorecebido",
	planocontas: "planocontasnome",
	banco: "banconome",
	nossonumero: "nossonumero",
	historico: "historico",
};

export type ConfigFiltroColunaFinanceiro = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

export function criarConfigFiltroColunasFinanceiro(
	opcoesTipoCobranca: OpcaoFiltroColunaTabela[],
): Record<string, ConfigFiltroColunaFinanceiro> {
	return {
		documento: { tipo: "texto", placeholder: "Documento" },
		tipodocumento: { tipo: "texto", placeholder: "Tipo de documento" },
		cobranca: { tipo: "opcoes", opcoes: opcoesTipoCobranca },
		emitente: { tipo: "texto", placeholder: "Nome" },
		parcela: { tipo: "nenhum" },
		status: { tipo: "opcoes", opcoes: STATUS_OPCOES_FILTRO },
		emissao: { tipo: "periodo" },
		vencimento: { tipo: "periodo" },
		vencimentooriginal: { tipo: "periodo" },
		ultimopagamento: { tipo: "periodo" },
		baixa: { tipo: "periodo" },
		datareferencia: { tipo: "periodo" },
		entrada: { tipo: "periodo" },
		valor: { tipo: "nenhum" },
		saldo: { tipo: "nenhum" },
		valorpagorecebido: { tipo: "nenhum" },
		planocontas: { tipo: "texto", placeholder: "Plano de contas" },
		centrocusto: { tipo: "nenhum" },
		banco: { tipo: "nenhum" },
		nossonumero: { tipo: "texto", placeholder: "Nosso número" },
		historico: { tipo: "texto", placeholder: "Histórico" },
	};
}

export function montarParamsFiltroFinanceiro(
	filtros: FiltrosColunaFinanceiroState,
): Partial<ListarFinanceirosParams> {
	const emissao = extrairPeriodoFiltro(filtros.emissao);
	const vencimento = extrairPeriodoFiltro(filtros.vencimento);
	const vencimentoOriginal = extrairPeriodoFiltro(filtros.vencimentooriginal);
	const pagamento = extrairPeriodoFiltro(filtros.ultimopagamento);
	const baixa = extrairPeriodoFiltro(filtros.baixa);
	const referencia = extrairPeriodoFiltro(filtros.datareferencia);
	const entrada = extrairPeriodoFiltro(filtros.entrada);

	return {
		...(filtros.documento ? { documento: filtros.documento } : {}),
		...(filtros.tipodocumentodescricao
			? { tipodocumentodescricao: filtros.tipodocumentodescricao }
			: {}),
		...(filtros.idtipocobranca
			? { idtipocobranca: filtros.idtipocobranca }
			: {}),
		...(filtros.emitente ? { emitente: filtros.emitente } : {}),
		...(filtros.status ? { status: filtros.status } : {}),
		...(filtros.planocontasnome
			? { planocontasnome: filtros.planocontasnome }
			: {}),
		...(filtros.nossonumero ? { nossonumero: filtros.nossonumero } : {}),
		...(filtros.historico ? { historico: filtros.historico } : {}),
		...(emissao.inicio ? { emissaoInicio: emissao.inicio } : {}),
		...(emissao.fim ? { emissaoFim: emissao.fim } : {}),
		...(vencimento.inicio ? { vencimentoInicio: vencimento.inicio } : {}),
		...(vencimento.fim ? { vencimentoFim: vencimento.fim } : {}),
		...(vencimentoOriginal.inicio
			? { vencimentooriginalInicio: vencimentoOriginal.inicio }
			: {}),
		...(vencimentoOriginal.fim
			? { vencimentooriginalFim: vencimentoOriginal.fim }
			: {}),
		...(pagamento.inicio ? { pagamentoInicio: pagamento.inicio } : {}),
		...(pagamento.fim ? { pagamentoFim: pagamento.fim } : {}),
		...(baixa.inicio ? { baixaInicio: baixa.inicio } : {}),
		...(baixa.fim ? { baixaFim: baixa.fim } : {}),
		...(referencia.inicio ? { datareferenciaInicio: referencia.inicio } : {}),
		...(referencia.fim ? { datareferenciaFim: referencia.fim } : {}),
		...(entrada.inicio ? { entradaInicio: entrada.inicio } : {}),
		...(entrada.fim ? { entradaFim: entrada.fim } : {}),
	};
}

type DefinicaoColunaFinanceiro = {
	id: string;
	label: string;
	labelReceber?: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
	somenteReceber?: boolean;
};

const DEFINICOES_BASE: DefinicaoColunaFinanceiro[] = [
	{ id: "select", label: "Seleção", visivelPadrao: true, enableHiding: false },
	{ id: "documento", label: "Documento", visivelPadrao: true },
	{ id: "tipodocumento", label: "Tipo de documento", visivelPadrao: true },
	{ id: "cobranca", label: "Cobrança", visivelPadrao: true },
	{ id: "emitente", label: "Nome", visivelPadrao: true },
	{ id: "parcela", label: "Parcela", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "emissao", label: "Emissão", visivelPadrao: true },
	{ id: "vencimento", label: "Vencimento", visivelPadrao: true },
	{ id: "ultimopagamento", label: "Último pagamento", visivelPadrao: true },
	{ id: "baixa", label: "Data da baixa", visivelPadrao: false },
	{ id: "datareferencia", label: "Competência", visivelPadrao: false },
	{ id: "entrada", label: "Entrada", visivelPadrao: false },
	{
		id: "vencimentooriginal",
		label: "Vencimento original",
		visivelPadrao: false,
	},
	{ id: "valor", label: "Valor", visivelPadrao: true },
	{
		id: "valorpagorecebido",
		label: "Valor pago",
		labelReceber: "Valor recebido",
		visivelPadrao: false,
	},
	{ id: "saldo", label: "Saldo", visivelPadrao: true },
	{
		id: "saldoSemJurosMulta",
		label: "Saldo sem juros/multa",
		visivelPadrao: true,
		somenteReceber: true,
	},
	{ id: "planocontas", label: "Plano de contas", visivelPadrao: false },
	{ id: "centrocusto", label: "Centro de custo", visivelPadrao: false },
	{ id: "banco", label: "Banco", visivelPadrao: false },
	{ id: "nossonumero", label: "Nosso número", visivelPadrao: false },
	{ id: "historico", label: "Histórico", visivelPadrao: false },
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
	return formatDataCivilBrasilia(date);
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
	const nomeBase =
		financeiro.emitente?.trim() || financeiro.entidadenome?.trim() || "";
	if (variante === "pagar") {
		return nomeBase || "-";
	}
	return nomeBase || financeiro.historico?.trim() || "-";
}

export function getStatusBadge(
	status: string | null | undefined,
	financeiro?: Financeiro,
) {
	if (!status) return <Badge variant="outline">-</Badge>;

	if (financeiro && ehTituloParcial(financeiro)) {
		return <Badge variant="outline">Parcial</Badge>;
	}

	if (financeiro && ehTituloPagoSemRastreio(financeiro)) {
		return <Badge variant="outline">Pago (sem rastreio)</Badge>;
	}

	const statusMap: Record<
		string,
		{
			label: string;
			variant: "default" | "secondary" | "destructive" | "outline";
		}
	> = {
		A: { label: "Aberto", variant: "default" },
		P: { label: "Pago", variant: "secondary" },
		B: { label: "Pago", variant: "secondary" },
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
	const saldo = Number.parseFloat(financeiro.saldo || "0") || 0;
	return financeiro.status === "A" && saldo > 0.009;
}

export type OpcoesColunasFinanceiro = {
	variante: VarianteFinanceiroLista;
	filtros: FiltrosColunaFinanceiroState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	opcoesTipoCobranca: OpcaoFiltroColunaTabela[];
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	onAlterarCobranca: (
		financeiroId: string,
		idtipocobranca: string | null,
	) => void;
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
		ordenacaoCampo && opcoes.ordenarPor === ordenacaoCampo && opcoes.ordem
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
		const rotulo =
			opcoes.variante === "receber" && def.labelReceber
				? def.labelReceber
				: def.label;
		const meta = { label: rotulo };

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
				header: () => <div className="text-right">{rotulo}</div>,
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
				header: rotulo,
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

		const header = () => criarHeaderColuna({ id: def.id, label: rotulo }, opcoes);

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
			case "tipodocumento":
				colunas.push({
					id: "tipodocumento",
					accessorKey: "tipodocumentodescricao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[180px] truncate">
							{row.original.tipodocumentodescricao || "-"}
						</div>
					),
				});
				break;
			case "cobranca":
				colunas.push({
					id: "cobranca",
					accessorKey: "idtipocobranca",
					header,
					meta,
					cell: ({ row }) => {
						const valorAtual = row.original.idtipocobranca ?? "";
						return (
							<Select
								value={valorAtual || "__none__"}
								onValueChange={(valor) => {
									const novoValor = valor === "__none__" ? null : valor;
									const atual = row.original.idtipocobranca ?? null;
									if (novoValor === atual) return;
									opcoes.onAlterarCobranca(row.original.id, novoValor);
								}}
							>
								<SelectTrigger
									size="sm"
									className="h-8 min-w-[140px] max-w-[200px]"
									aria-label="Tipo de cobrança"
								>
									<SelectValue placeholder="Sem cobrança" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">Sem cobrança</SelectItem>
									{opcoes.opcoesTipoCobranca.map((opcao) => (
										<SelectItem key={opcao.value} value={opcao.value}>
											{opcao.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						);
					},
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
					cell: ({ row }) =>
						getStatusBadge(row.original.status, row.original),
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
			case "vencimentooriginal":
				colunas.push({
					id: "vencimentooriginal",
					accessorKey: "vencimentooriginal",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatDate(row.original.vencimentooriginal)}</div>
					),
				});
				break;
			case "ultimopagamento":
				colunas.push({
					id: "ultimopagamento",
					accessorKey: "ultimopagamento",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							{formatDate(
								row.original.ultimopagamento ?? row.original.pagamento,
							)}
						</div>
					),
				});
				break;
			case "baixa":
				colunas.push({
					id: "baixa",
					accessorKey: "baixa",
					header,
					meta,
					cell: ({ row }) => <div>{formatDate(row.original.baixa)}</div>,
				});
				break;
			case "datareferencia":
				colunas.push({
					id: "datareferencia",
					accessorKey: "datareferencia",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatDate(row.original.datareferencia)}</div>
					),
				});
				break;
			case "entrada":
				colunas.push({
					id: "entrada",
					accessorKey: "entrada",
					header,
					meta,
					cell: ({ row }) => <div>{formatDate(row.original.entrada)}</div>,
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
			case "valorpagorecebido":
				colunas.push({
					id: "valorpagorecebido",
					accessorKey: "valorpagorecebido",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-right font-medium">
							{formatCurrency(row.original.valorpagorecebido)}
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
			case "planocontas":
				colunas.push({
					id: "planocontas",
					accessorKey: "planocontasnome",
					header,
					meta,
					cell: ({ row }) => {
						const codigo = row.original.planocontascodigo?.trim();
						const nome = row.original.planocontasnome?.trim();
						const texto =
							codigo && nome ? `${codigo} — ${nome}` : nome || codigo || "-";
						return <div className="max-w-[200px] truncate">{texto}</div>;
					},
				});
				break;
			case "centrocusto":
				colunas.push({
					id: "centrocusto",
					accessorKey: "centrocustonome",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[180px] truncate">
							{row.original.centrocustonome || "-"}
						</div>
					),
				});
				break;
			case "banco":
				colunas.push({
					id: "banco",
					accessorKey: "banconome",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[160px] truncate">
							{row.original.banconome || "-"}
						</div>
					),
				});
				break;
			case "nossonumero":
				colunas.push({
					id: "nossonumero",
					accessorKey: "nossonumero",
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[140px] truncate">
							{row.original.nossonumero || "-"}
						</div>
					),
				});
				break;
			case "historico":
				colunas.push({
					id: "historico",
					accessorKey: "historico",
					header,
					meta,
					cell: ({ row }) => (
						<div
							className="max-w-[220px] truncate"
							title={row.original.historico ?? undefined}
						>
							{row.original.historico || "-"}
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
