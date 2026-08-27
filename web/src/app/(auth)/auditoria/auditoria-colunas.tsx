import { IconEye } from "@tabler/icons-react";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
	CabecalhoColunaTabela,
	type OrdenacaoColunaTabela,
	type TipoFiltroColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Button } from "@/components/ui/button";
import {
	formatarAcaoAuditoria,
	formatarRecursoAuditoria,
} from "@/lib/auditoria-utils";
import type { Auditoria } from "@/services/auditoria.service";

export type FiltrosColunaAuditoriaState = {
	acao: string;
	recurso: string;
	nomeusuario: string;
	criadoem: string;
	idrecurso: string;
	nomeempresa: string;
};

export const filtrosColunaAuditoriaVazios: FiltrosColunaAuditoriaState = {
	acao: "",
	recurso: "",
	nomeusuario: "",
	criadoem: "",
	idrecurso: "",
	nomeempresa: "",
};

export type CampoFiltroColunaAuditoria = keyof FiltrosColunaAuditoriaState;

export const COLUNA_PARA_CAMPO_FILTRO_AUDITORIA: Record<
	string,
	CampoFiltroColunaAuditoria
> = {
	acao: "acao",
	recurso: "recurso",
	nomeusuario: "nomeusuario",
	criadoem: "criadoem",
	idrecurso: "idrecurso",
	nomeempresa: "nomeempresa",
};

export const COLUNA_PARA_ORDENAR_AUDITORIA: Record<string, string> = {
	acao: "acao",
	recurso: "recurso",
	nomeusuario: "nomeusuario",
	criadoem: "criadoem",
	idrecurso: "idrecurso",
	nomeempresa: "nomeempresa",
};

export type ConfigFiltroColunaAuditoria = {
	tipo: TipoFiltroColunaTabela;
	placeholder?: string;
};

type DefinicaoColuna = {
	id: string;
	label: string;
	visivelPadrao: boolean;
	enableHiding?: boolean;
};

const DEFINICOES_COLUNAS: DefinicaoColuna[] = [
	{ id: "acao", label: "Ação", visivelPadrao: true },
	{ id: "recurso", label: "Recurso", visivelPadrao: true },
	{ id: "nomeusuario", label: "Usuário", visivelPadrao: true },
	{ id: "criadoem", label: "Data/Hora", visivelPadrao: true },
	{ id: "idrecurso", label: "ID recurso", visivelPadrao: false },
	{ id: "nomeempresa", label: "Empresa", visivelPadrao: false },
	{ id: "acoes", label: "Ações", visivelPadrao: true, enableHiding: false },
];

export function visibilidadePadraoColunasAuditoria(): VisibilityState {
	const state: VisibilityState = {};
	for (const def of DEFINICOES_COLUNAS) {
		if (def.enableHiding === false) continue;
		state[def.id] = def.visivelPadrao;
	}
	return state;
}

export type OpcoesColunasAuditoria = {
	filtros: FiltrosColunaAuditoriaState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaTabela) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaAuditoria>;
	onViewDetails: (auditoria: Auditoria) => void;
};

function criarHeaderColuna(
	def: { id: string; label: string },
	opcoes: OpcoesColunasAuditoria,
) {
	const configFiltro = opcoes.configFiltroPorColuna[def.id] ?? {
		tipo: "nenhum" as const,
	};
	const campo = COLUNA_PARA_CAMPO_FILTRO_AUDITORIA[def.id];
	const valorFiltro = campo ? (opcoes.filtros[campo] ?? "") : "";
	const filtroAtivo = valorFiltro.trim() !== "";
	const ordenacaoCampo = COLUNA_PARA_ORDENAR_AUDITORIA[def.id] ?? def.id;
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
			placeholderFiltro={configFiltro.placeholder}
		/>
	);
}

export function criarColunasAuditoria(
	opcoes: OpcoesColunasAuditoria,
): ColumnDef<Auditoria>[] {
	const colunas: ColumnDef<Auditoria>[] = [];

	for (const def of DEFINICOES_COLUNAS) {
		const meta = { label: def.label };

		if (def.id === "acoes") {
			colunas.push({
				id: "acoes",
				header: "Ações",
				enableHiding: false,
				meta,
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => opcoes.onViewDetails(row.original)}
							className="gap-2"
						>
							<IconEye className="size-4" />
							Ver Detalhes
						</Button>
					</div>
				),
			});
			continue;
		}

		const header = () => criarHeaderColuna(def, opcoes);

		switch (def.id) {
			case "acao":
				colunas.push({
					id: "acao",
					accessorKey: "acao",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-medium">
							{formatarAcaoAuditoria(row.getValue("acao") as string)}
						</div>
					),
				});
				break;
			case "recurso":
				colunas.push({
					id: "recurso",
					accessorKey: "recurso",
					header,
					meta,
					cell: ({ row }) => (
						<div>
							{formatarRecursoAuditoria(row.getValue("recurso") as string)}
						</div>
					),
				});
				break;
			case "nomeusuario":
				colunas.push({
					id: "nomeusuario",
					accessorKey: "nomeusuario",
					header,
					meta,
					cell: ({ row }) => (
						<div className="text-muted-foreground">
							{row.getValue("nomeusuario") || "-"}
						</div>
					),
				});
				break;
			case "criadoem":
				colunas.push({
					id: "criadoem",
					accessorKey: "criadoem",
					header,
					meta,
					cell: ({ row }) => {
						const data = row.getValue("criadoem") as string;
						return <div>{dayjs(data).format("DD/MM/YYYY HH:mm:ss")}</div>;
					},
				});
				break;
			case "idrecurso":
				colunas.push({
					id: "idrecurso",
					accessorKey: "idrecurso",
					header,
					meta,
					cell: ({ row }) => (
						<div className="font-mono text-xs text-muted-foreground">
							{(row.getValue("idrecurso") as string | null) || "-"}
						</div>
					),
				});
				break;
			case "nomeempresa":
				colunas.push({
					id: "nomeempresa",
					accessorKey: "nomeempresa",
					header,
					meta,
					cell: ({ row }) => (
						<div>{(row.getValue("nomeempresa") as string | null) || "-"}</div>
					),
				});
				break;
			default:
				break;
		}
	}

	return colunas;
}
