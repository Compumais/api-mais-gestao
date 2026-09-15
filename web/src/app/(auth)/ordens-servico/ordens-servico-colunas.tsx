import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ROTULOS_CAMPOS_ORDEM_SERVICO } from "@/schemas/ordem-servico.schema";
import type {
	CampoExtraOrdemServico,
	ConfiguracaoOrdemServico,
	OrdemServico,
} from "@/services/ordem-servico.service";
import {
	camposExtrasAtivos,
	formatarDataHoraOs,
	formatarDataOs,
	formatarMoedaOs,
} from "@/util/ordem-servico-ui";
import {
	CabecalhoColunaOs,
	type OpcaoFiltroColunaOs,
	type OrdenacaoColunaOs,
	type TipoFiltroColunaOs,
} from "./components/cabecalho-coluna-os";

export type MapaNomes = Record<string, string>;

export type FiltrosColunaOsState = {
	dataInicio: string;
	dataFim: string;
	idcliente: string;
	idultimotecnico: string;
	idatendente: string;
	idobjeto: string;
	idarea: string;
	idtipoproblema: string;
	status: string;
	codigo: string;
	orcamento: string;
	busca: string;
	cnpjcpfcliente: string;
	geroufinanceiro: string;
	faturouparanota: string;
	faturouparacupom: string;
	agendamento: string;
	previsaoconclusao: string;
	dataultimoevento: string;
	problemadescrito: string;
	laudotecnico: string;
	observacao: string;
	descricaotipoultimoevento: string;
	descricaoultimoevento: string;
	placa: string;
	marca: string;
	modelo: string;
	renavam: string;
	extra1: string;
	extra2: string;
	extra3: string;
	extra4: string;
	extra5: string;
	extra6: string;
	extra7: string;
	extra8: string;
	extra9: string;
	extra10: string;
	extra11: string;
	extra12: string;
	extra13: string;
	extra14: string;
	extra15: string;
	extra16: string;
};

export const filtrosColunaOsVazios: FiltrosColunaOsState = {
	dataInicio: "",
	dataFim: "",
	idcliente: "",
	idultimotecnico: "",
	idatendente: "",
	idobjeto: "",
	idarea: "",
	idtipoproblema: "",
	status: "",
	codigo: "",
	orcamento: "",
	busca: "",
	cnpjcpfcliente: "",
	geroufinanceiro: "",
	faturouparanota: "",
	faturouparacupom: "",
	agendamento: "",
	previsaoconclusao: "",
	dataultimoevento: "",
	problemadescrito: "",
	laudotecnico: "",
	observacao: "",
	descricaotipoultimoevento: "",
	descricaoultimoevento: "",
	placa: "",
	marca: "",
	modelo: "",
	renavam: "",
	extra1: "",
	extra2: "",
	extra3: "",
	extra4: "",
	extra5: "",
	extra6: "",
	extra7: "",
	extra8: "",
	extra9: "",
	extra10: "",
	extra11: "",
	extra12: "",
	extra13: "",
	extra14: "",
	extra15: "",
	extra16: "",
};

export type CampoFiltroColunaOs = keyof FiltrosColunaOsState;

/** Mapeia id da coluna da tabela → campo do estado de filtros */
export const COLUNA_PARA_CAMPO_FILTRO: Record<string, CampoFiltroColunaOs> = {
	codigo: "codigo",
	cliente: "busca",
	cnpjcpfcliente: "cnpjcpfcliente",
	data: "dataInicio",
	status: "status",
	orcamento: "orcamento",
	tecnico: "idultimotecnico",
	atendente: "idatendente",
	objeto: "idobjeto",
	area: "idarea",
	tipoproblema: "idtipoproblema",
	agendamento: "agendamento",
	previsaoconclusao: "previsaoconclusao",
	dataultimoevento: "dataultimoevento",
	problemadescrito: "problemadescrito",
	laudotecnico: "laudotecnico",
	observacao: "observacao",
	descricaotipoultimoevento: "descricaotipoultimoevento",
	descricaoultimoevento: "descricaoultimoevento",
	geroufinanceiro: "geroufinanceiro",
	faturouparanota: "faturouparanota",
	faturouparacupom: "faturouparacupom",
	placa: "placa",
	marca: "marca",
	modelo: "modelo",
	renavam: "renavam",
	extra1: "extra1",
	extra2: "extra2",
	extra3: "extra3",
	extra4: "extra4",
	extra5: "extra5",
	extra6: "extra6",
	extra7: "extra7",
	extra8: "extra8",
	extra9: "extra9",
	extra10: "extra10",
	extra11: "extra11",
	extra12: "extra12",
	extra13: "extra13",
	extra14: "extra14",
	extra15: "extra15",
	extra16: "extra16",
};

export type ConfigFiltroColunaOs = {
	tipo: TipoFiltroColunaOs;
	opcoes?: OpcaoFiltroColunaOs[];
	placeholder?: string;
};

export type OpcoesColunasOs = {
	config: ConfiguracaoOrdemServico | null | undefined;
	mapaUsuarios: MapaNomes;
	mapaObjetos: MapaNomes;
	mapaAreas: MapaNomes;
	mapaTiposProblema: MapaNomes;
	renderAcoes: (os: OrdemServico) => ReactNode;
	renderStatus: (status: number | null) => ReactNode;
	filtros: FiltrosColunaOsState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaOs) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaOs>;
};

type DefinicaoColunaOs = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	requerConfig?:
		| "usaobjeto"
		| "usaarea"
		| "usatipoproblema"
		| "usadadosveiculo";
};

const DEFINICOES_BASE: DefinicaoColunaOs[] = [
	{ id: "codigo", label: "Código", visivelPadrao: true },
	{ id: "cliente", label: "Cliente", visivelPadrao: true },
	{
		id: "cnpjcpfcliente",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.cnpjcpfcliente ?? "CNPJ/CPF",
		visivelPadrao: false,
	},
	{ id: "data", label: "Data", visivelPadrao: true },
	{ id: "status", label: "Status", visivelPadrao: true },
	{ id: "valor", label: "Valor", visivelPadrao: true },
	{ id: "orcamento", label: "Orçamento", visivelPadrao: true },
	{
		id: "tecnico",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.idultimotecnico ?? "Técnico",
		visivelPadrao: false,
	},
	{
		id: "atendente",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.idatendente ?? "Atendente",
		visivelPadrao: false,
	},
	{
		id: "objeto",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.idobjeto ?? "Objeto",
		visivelPadrao: false,
		requerConfig: "usaobjeto",
	},
	{
		id: "area",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.idarea ?? "Área",
		visivelPadrao: false,
		requerConfig: "usaarea",
	},
	{
		id: "tipoproblema",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.idtipoproblema ?? "Tipo de problema",
		visivelPadrao: false,
		requerConfig: "usatipoproblema",
	},
	{
		id: "agendamento",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.agendamento ?? "Agendamento",
		visivelPadrao: false,
	},
	{
		id: "previsaoconclusao",
		label:
			ROTULOS_CAMPOS_ORDEM_SERVICO.previsaoconclusao ?? "Previsão de conclusão",
		visivelPadrao: false,
	},
	{
		id: "dataultimoevento",
		label: "Data do último evento",
		visivelPadrao: false,
	},
	{
		id: "problemadescrito",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.problemadescrito ?? "Problema descrito",
		visivelPadrao: false,
	},
	{
		id: "laudotecnico",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.laudotecnico ?? "Laudo técnico",
		visivelPadrao: false,
	},
	{
		id: "observacao",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.observacao ?? "Observação",
		visivelPadrao: false,
	},
	{
		id: "descricaotipoultimoevento",
		label: "Tipo do último evento",
		visivelPadrao: false,
	},
	{
		id: "descricaoultimoevento",
		label: "Último evento",
		visivelPadrao: false,
	},
	{ id: "valorprodutos", label: "Valor produtos", visivelPadrao: false },
	{ id: "valorservicos", label: "Valor serviços", visivelPadrao: false },
	{ id: "descontosubtotal", label: "Desconto", visivelPadrao: false },
	{ id: "geroufinanceiro", label: "Gerou financeiro", visivelPadrao: false },
	{ id: "faturouparanota", label: "Faturou para NF", visivelPadrao: false },
	{ id: "faturouparacupom", label: "Faturou para cupom", visivelPadrao: false },
	{
		id: "placa",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.placa ?? "Placa",
		visivelPadrao: false,
		requerConfig: "usadadosveiculo",
	},
	{
		id: "marca",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.marca ?? "Marca",
		visivelPadrao: false,
		requerConfig: "usadadosveiculo",
	},
	{
		id: "modelo",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.modelo ?? "Modelo",
		visivelPadrao: false,
		requerConfig: "usadadosveiculo",
	},
	{
		id: "renavam",
		label: ROTULOS_CAMPOS_ORDEM_SERVICO.renavam ?? "Renavam",
		visivelPadrao: false,
		requerConfig: "usadadosveiculo",
	},
];

function flagConfigAtiva(
	config: ConfiguracaoOrdemServico | null | undefined,
	flag: NonNullable<DefinicaoColunaOs["requerConfig"]>,
) {
	if (!config) return true;
	return (config[flag] ?? 1) === 1;
}

function textoTruncado(valor: string | null | undefined) {
	const texto = (valor ?? "").trim();
	if (!texto) return "—";
	return (
		<div className="max-w-[220px] truncate" title={texto}>
			{texto}
		</div>
	);
}

function simNao(valor: number | null | undefined) {
	return valor === 1 ? "Sim" : "Não";
}

function resolverNome(mapa: MapaNomes, id: string | null | undefined) {
	if (!id) return "—";
	return mapa[id] ?? "—";
}

function valorFiltroColuna(
	filtros: FiltrosColunaOsState,
	colunaId: string,
): string {
	const campo = COLUNA_PARA_CAMPO_FILTRO[colunaId];
	if (!campo) return "";
	if (colunaId === "data") {
		// filtro de data na coluna usa dataInicio; só considera ativo se dataInicio === dataFim
		if (filtros.dataInicio && filtros.dataInicio === filtros.dataFim) {
			return filtros.dataInicio;
		}
		if (filtros.dataInicio && !filtros.dataFim) return filtros.dataInicio;
		return "";
	}
	return filtros[campo] ?? "";
}

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasOs,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const valorFiltro = valorFiltroColuna(opcoes.filtros, def.id);
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacao: OrdenacaoColunaOs =
		opcoes.ordenarPor === def.id && opcoes.ordem ? opcoes.ordem : false;

	return (
		<CabecalhoColunaOs
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

export function listarDefinicoesColunasOs(opcoes: {
	config: ConfiguracaoOrdemServico | null | undefined;
	camposextras?: CampoExtraOrdemServico[] | null;
}): Array<{ id: string; label: string; visivelPadrao: boolean }> {
	const base = DEFINICOES_BASE.filter((def) => {
		if (!def.requerConfig) return true;
		return flagConfigAtiva(opcoes.config, def.requerConfig);
	}).map(({ id, label, visivelPadrao }) => ({ id, label, visivelPadrao }));

	const extras = camposExtrasAtivos(
		opcoes.camposextras ?? opcoes.config?.camposextras,
	).map((extra) => ({
		id: extra.campo,
		label: extra.nome?.trim() || `Campo extra (${extra.campo})`,
		visivelPadrao: false,
	}));

	return [
		...base,
		...extras,
		{ id: "acoes", label: "Ações", visivelPadrao: true },
	];
}

export function visibilidadePadraoColunasOs(opcoes: {
	config: ConfiguracaoOrdemServico | null | undefined;
	camposextras?: CampoExtraOrdemServico[] | null;
}): VisibilityState {
	const state: VisibilityState = {};
	for (const def of listarDefinicoesColunasOs(opcoes)) {
		if (def.id === "acoes") continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export function criarColunasOrdensServico(
	opcoes: OpcoesColunasOs,
): ColumnDef<OrdemServico>[] {
	const definicoes = listarDefinicoesColunasOs({
		config: opcoes.config,
		camposextras: opcoes.config?.camposextras,
	});

	const colunas: ColumnDef<OrdemServico>[] = [];

	for (const def of definicoes) {
		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				cell: ({ row }) => opcoes.renderAcoes(row.original),
				meta: { label: "Ações" },
			});
			continue;
		}

		const meta = { label: def.label };
		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "codigo":
				colunas.push({
					accessorKey: "codigo",
					header,
					meta,
					cell: ({ row }) => (
						<span className="font-medium">{row.original.codigo ?? "—"}</span>
					),
				});
				break;
			case "cliente":
				colunas.push({
					id: "cliente",
					accessorFn: (row) => row.nomecliente,
					header,
					meta,
					cell: ({ row }) => (
						<div className="max-w-[220px] truncate">
							{row.original.nomecliente ?? "Sem cliente"}
						</div>
					),
				});
				break;
			case "cnpjcpfcliente":
				colunas.push({
					accessorKey: "cnpjcpfcliente",
					header,
					meta,
					cell: ({ row }) => row.original.cnpjcpfcliente ?? "—",
				});
				break;
			case "data":
				colunas.push({
					id: "data",
					accessorFn: (row) => row.dataos ?? row.data,
					header,
					meta,
					cell: ({ row }) =>
						formatarDataOs(row.original.dataos ?? row.original.data),
				});
				break;
			case "status":
				colunas.push({
					id: "status",
					accessorFn: (row) => row.status,
					header,
					meta,
					cell: ({ row }) => opcoes.renderStatus(row.original.status),
				});
				break;
			case "valor":
				colunas.push({
					id: "valor",
					accessorFn: (row) => row.valor,
					header,
					meta,
					cell: ({ row }) => formatarMoedaOs(row.original.valor),
				});
				break;
			case "orcamento":
				colunas.push({
					id: "orcamento",
					accessorFn: (row) => row.orcamento,
					header,
					meta,
					cell: ({ row }) => simNao(row.original.orcamento),
				});
				break;
			case "tecnico":
				colunas.push({
					id: "tecnico",
					accessorFn: (row) => row.idultimotecnico,
					header,
					meta,
					cell: ({ row }) =>
						resolverNome(opcoes.mapaUsuarios, row.original.idultimotecnico),
				});
				break;
			case "atendente":
				colunas.push({
					id: "atendente",
					accessorFn: (row) => row.idatendente,
					header,
					meta,
					cell: ({ row }) =>
						resolverNome(opcoes.mapaUsuarios, row.original.idatendente),
				});
				break;
			case "objeto":
				colunas.push({
					id: "objeto",
					accessorFn: (row) => row.idobjeto,
					header,
					meta,
					cell: ({ row }) =>
						resolverNome(opcoes.mapaObjetos, row.original.idobjeto),
				});
				break;
			case "area":
				colunas.push({
					id: "area",
					accessorFn: (row) => row.idarea,
					header,
					meta,
					cell: ({ row }) =>
						resolverNome(opcoes.mapaAreas, row.original.idarea),
				});
				break;
			case "tipoproblema":
				colunas.push({
					id: "tipoproblema",
					accessorFn: (row) => row.idtipoproblema,
					header,
					meta,
					cell: ({ row }) =>
						resolverNome(opcoes.mapaTiposProblema, row.original.idtipoproblema),
				});
				break;
			case "agendamento":
				colunas.push({
					accessorKey: "agendamento",
					header,
					meta,
					cell: ({ row }) => formatarDataHoraOs(row.original.agendamento),
				});
				break;
			case "previsaoconclusao":
				colunas.push({
					accessorKey: "previsaoconclusao",
					header,
					meta,
					cell: ({ row }) => formatarDataOs(row.original.previsaoconclusao),
				});
				break;
			case "dataultimoevento":
				colunas.push({
					accessorKey: "dataultimoevento",
					header,
					meta,
					cell: ({ row }) => formatarDataHoraOs(row.original.dataultimoevento),
				});
				break;
			case "problemadescrito":
				colunas.push({
					accessorKey: "problemadescrito",
					header,
					meta,
					cell: ({ row }) => textoTruncado(row.original.problemadescrito),
				});
				break;
			case "laudotecnico":
				colunas.push({
					accessorKey: "laudotecnico",
					header,
					meta,
					cell: ({ row }) => textoTruncado(row.original.laudotecnico),
				});
				break;
			case "observacao":
				colunas.push({
					accessorKey: "observacao",
					header,
					meta,
					cell: ({ row }) => textoTruncado(row.original.observacao),
				});
				break;
			case "descricaotipoultimoevento":
				colunas.push({
					accessorKey: "descricaotipoultimoevento",
					header,
					meta,
					cell: ({ row }) =>
						textoTruncado(row.original.descricaotipoultimoevento),
				});
				break;
			case "descricaoultimoevento":
				colunas.push({
					accessorKey: "descricaoultimoevento",
					header,
					meta,
					cell: ({ row }) => textoTruncado(row.original.descricaoultimoevento),
				});
				break;
			case "valorprodutos":
				colunas.push({
					accessorKey: "valorprodutos",
					header,
					meta,
					cell: ({ row }) => formatarMoedaOs(row.original.valorprodutos),
				});
				break;
			case "valorservicos":
				colunas.push({
					accessorKey: "valorservicos",
					header,
					meta,
					cell: ({ row }) => formatarMoedaOs(row.original.valorservicos),
				});
				break;
			case "descontosubtotal":
				colunas.push({
					accessorKey: "descontosubtotal",
					header,
					meta,
					cell: ({ row }) => formatarMoedaOs(row.original.descontosubtotal),
				});
				break;
			case "geroufinanceiro":
				colunas.push({
					accessorKey: "geroufinanceiro",
					header,
					meta,
					cell: ({ row }) => simNao(row.original.geroufinanceiro),
				});
				break;
			case "faturouparanota":
				colunas.push({
					accessorKey: "faturouparanota",
					header,
					meta,
					cell: ({ row }) => simNao(row.original.faturouparanota),
				});
				break;
			case "faturouparacupom":
				colunas.push({
					accessorKey: "faturouparacupom",
					header,
					meta,
					cell: ({ row }) => simNao(row.original.faturouparacupom),
				});
				break;
			case "placa":
			case "marca":
			case "modelo":
			case "renavam":
				colunas.push({
					accessorKey: def.id,
					header,
					meta,
					cell: ({ row }) =>
						(row.original[def.id as keyof OrdemServico] as string | null) ??
						"—",
				});
				break;
			default:
				if (def.id.startsWith("extra")) {
					const campo = def.id as keyof OrdemServico;
					colunas.push({
						id: def.id,
						accessorFn: (row) => row[campo],
						header,
						meta,
						cell: ({ row }) =>
							textoTruncado(
								(row.original[campo] as string | null | undefined) ?? null,
							),
					});
				}
				break;
		}
	}

	return colunas;
}
