import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
	CabecalhoColunaTabela,
	type OpcaoFiltroColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import type { Entidade } from "@/services/entidades.service";
import { labelIndIeDest } from "@/util/destinatario-nfe-util";

export const TIPOPESSOA_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "0", label: "Física" },
	{ value: "1", label: "Jurídica" },
];

export const INDIEEDEST_OPCOES_FILTRO: OpcaoFiltroColunaTabela[] = [
	{ value: "1", label: "1 - Contribuinte ICMS" },
	{ value: "2", label: "2 - Contribuinte isento de IE" },
	{ value: "9", label: "9 - Não contribuinte" },
];

export type FiltrosColunaClientesState = {
	nome: string;
	razaosocial: string;
	cnpjcpf: string;
	endereco: string;
	tipopessoa: string;
	indiedest: string;
	inscricaoestadual: string;
	rg: string;
	email: string;
	telefone: string;
	numeroendereco: string;
	complemento: string;
	bairro: string;
	cep: string;
	fax: string;
	nascimento: string;
	pais: string;
	criadoem: string;
};

export const filtrosColunaClientesVazios: FiltrosColunaClientesState = {
	nome: "",
	razaosocial: "",
	cnpjcpf: "",
	endereco: "",
	tipopessoa: "",
	indiedest: "",
	inscricaoestadual: "",
	rg: "",
	email: "",
	telefone: "",
	numeroendereco: "",
	complemento: "",
	bairro: "",
	cep: "",
	fax: "",
	nascimento: "",
	pais: "",
	criadoem: "",
};

export type CampoFiltroColunaClientes = keyof FiltrosColunaClientesState;

export const COLUNA_PARA_CAMPO_FILTRO_CLIENTE: Record<
	string,
	CampoFiltroColunaClientes
> = {
	nome: "nome",
	razaosocial: "razaosocial",
	cnpjcpf: "cnpjcpf",
	endereco: "endereco",
	tipopessoa: "tipopessoa",
	indiedest: "indiedest",
	inscricaoestadual: "inscricaoestadual",
	rg: "rg",
	email: "email",
	telefone: "telefone",
	numeroendereco: "numeroendereco",
	complemento: "complemento",
	bairro: "bairro",
	cep: "cep",
	fax: "fax",
	nascimento: "nascimento",
	pais: "pais",
	criadoem: "criadoem",
};

export type ConfigFiltroColunaCliente = {
	tipo: TipoFiltroColunaTabela;
	opcoes?: OpcaoFiltroColunaTabela[];
	placeholder?: string;
};

type DefinicaoColunaCliente = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColunaCliente[] = [
	{ id: "nome", label: "Nome", visivelPadrao: true },
	{ id: "razaosocial", label: "Razão Social", visivelPadrao: true },
	{ id: "cnpjcpf", label: "CNPJ/CPF", visivelPadrao: true },
	{ id: "endereco", label: "Endereço", visivelPadrao: true },
	{ id: "tipopessoa", label: "Tipo de pessoa", visivelPadrao: false },
	{ id: "indiedest", label: "Indicador IE", visivelPadrao: false },
	{ id: "inscricaoestadual", label: "Inscrição estadual", visivelPadrao: false },
	{ id: "rg", label: "RG", visivelPadrao: false },
	{ id: "email", label: "E-mail", visivelPadrao: false },
	{ id: "telefone", label: "Telefone", visivelPadrao: false },
	{ id: "numeroendereco", label: "Nº", visivelPadrao: false },
	{ id: "complemento", label: "Complemento", visivelPadrao: false },
	{ id: "bairro", label: "Bairro", visivelPadrao: false },
	{ id: "cep", label: "CEP", visivelPadrao: false },
	{ id: "fax", label: "Fax", visivelPadrao: false },
	{ id: "nascimento", label: "Nascimento", visivelPadrao: false },
	{ id: "pais", label: "País", visivelPadrao: false },
	{ id: "criadoem", label: "Data cadastro", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasClientes(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

function formatarTipopessoa(valor: number | null | undefined) {
	if (valor === 0) return "Física";
	if (valor === 1) return "Jurídica";
	return "-";
}

function formatarData(valor: string | null | undefined) {
	if (!valor) return "-";
	const data = new Date(valor.includes("T") ? valor : `${valor}T12:00:00`);
	if (Number.isNaN(data.getTime())) return valor;
	return new Intl.DateTimeFormat("pt-BR").format(data);
}

function formatarDocumento(valor: string | null | undefined) {
	if (!valor) return "-";
	return maskCpfCnpj(valor) || valor;
}

function formatarTelefone(valor: string | null | undefined) {
	if (!valor) return "-";
	return maskPhone(valor) || valor;
}

function formatarCep(valor: string | null | undefined) {
	if (!valor) return "-";
	return maskCep(valor) || valor;
}

export type OpcoesColunasClientes = {
	filtros: FiltrosColunaClientesState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaCliente>;
	renderAcoes: (entidade: Entidade) => ReactNode;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasClientes,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "texto" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_CLIENTE[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacao: OrdenacaoColunaTabela =
		opcoes.ordenarPor === def.id && opcoes.ordem ? opcoes.ordem : false;

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

export function criarColunasClientes(
	opcoes: OpcoesColunasClientes,
): ColumnDef<Entidade>[] {
	const colunas: ColumnDef<Entidade>[] = [];

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
			case "nome":
				colunas.push({
					accessorKey: "nome",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.nome ?? "-"}</div>,
				});
				break;
			case "razaosocial":
				colunas.push({
					accessorKey: "razaosocial",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.razaosocial ?? "-"}</div>,
				});
				break;
			case "cnpjcpf":
				colunas.push({
					accessorKey: "cnpjcpf",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarDocumento(row.original.cnpjcpf)}</div>
					),
				});
				break;
			case "endereco":
				colunas.push({
					accessorKey: "endereco",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.endereco ?? "-"}</div>,
				});
				break;
			case "tipopessoa":
				colunas.push({
					accessorKey: "tipopessoa",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarTipopessoa(row.original.tipopessoa)}</div>
					),
				});
				break;
			case "indiedest":
				colunas.push({
					accessorKey: "indiedest",
					header,
					meta,
					cell: ({ row }) => (
						<div>{labelIndIeDest(row.original.indiedest) ?? "-"}</div>
					),
				});
				break;
			case "inscricaoestadual":
				colunas.push({
					accessorKey: "inscricaoestadual",
					header,
					meta,
					cell: ({ row }) => (
						<div>{row.original.inscricaoestadual ?? "-"}</div>
					),
				});
				break;
			case "rg":
				colunas.push({
					accessorKey: "rg",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.rg ?? "-"}</div>,
				});
				break;
			case "email":
				colunas.push({
					accessorKey: "email",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.email ?? "-"}</div>,
				});
				break;
			case "telefone":
				colunas.push({
					accessorKey: "telefone",
					header,
					meta,
					cell: ({ row }) => (
						<div>{formatarTelefone(row.original.telefone)}</div>
					),
				});
				break;
			case "numeroendereco":
				colunas.push({
					accessorKey: "numeroendereco",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.numeroendereco ?? "-"}</div>,
				});
				break;
			case "complemento":
				colunas.push({
					accessorKey: "complemento",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.complemento ?? "-"}</div>,
				});
				break;
			case "bairro":
				colunas.push({
					accessorKey: "bairro",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.bairro ?? "-"}</div>,
				});
				break;
			case "cep":
				colunas.push({
					accessorKey: "cep",
					header,
					meta,
					cell: ({ row }) => <div>{formatarCep(row.original.cep)}</div>,
				});
				break;
			case "fax":
				colunas.push({
					accessorKey: "fax",
					header,
					meta,
					cell: ({ row }) => <div>{formatarTelefone(row.original.fax)}</div>,
				});
				break;
			case "nascimento":
				colunas.push({
					accessorKey: "nascimento",
					header,
					meta,
					cell: ({ row }) => <div>{formatarData(row.original.nascimento)}</div>,
				});
				break;
			case "pais":
				colunas.push({
					accessorKey: "pais",
					header,
					meta,
					cell: ({ row }) => <div>{row.original.pais ?? "-"}</div>,
				});
				break;
			case "criadoem":
				colunas.push({
					accessorKey: "criadoem",
					header,
					meta,
					cell: ({ row }) => <div>{formatarData(row.original.criadoem)}</div>,
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
