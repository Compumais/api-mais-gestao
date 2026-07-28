export const ORDEM_SERVICO_CAMPOS_EXTRA = [
	"extra1",
	"extra2",
	"extra3",
	"extra4",
	"extra5",
	"extra6",
	"extra7",
	"extra8",
	"extra9",
	"extra10",
	"extra11",
	"extra12",
	"extra13",
	"extra14",
	"extra15",
	"extra16",
] as const;

export type OrdemServicoCampoExtra =
	(typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number];

export const ORDEM_SERVICO_STATUS_CODIGOS = [
	"ABERTA",
	"EM_EXECUCAO",
	"FINALIZADA",
	"CANCELADA",
	"FATURADA",
	"AGENDADA",
	"PAUSADA",
	"MESCLADA",
	"DUPLICADA",
	"SERVICO_NAO_EXECUTADO",
	"ORCAMENTO",
	"FATURADA_PARCIALMENTE",
	"RETIRADA",
] as const;

export type OrdemServicoStatusCodigo =
	(typeof ORDEM_SERVICO_STATUS_CODIGOS)[number];

export type OrdemServicoStatusPadrao = {
	codigo: OrdemServicoStatusCodigo;
	status: number;
	cor: string;
	descricao: string;
	ordem: number;
};

export const ORDEM_SERVICO_STATUS_PADRAO: OrdemServicoStatusPadrao[] = [
	{
		codigo: "ABERTA",
		status: 1,
		cor: "#FFFFFF",
		descricao: "Aberta",
		ordem: 1,
	},
	{
		codigo: "EM_EXECUCAO",
		status: 2,
		cor: "#22C55E",
		descricao: "Em execução",
		ordem: 2,
	},
	{
		codigo: "FINALIZADA",
		status: 3,
		cor: "#3B82F6",
		descricao: "Finalizada",
		ordem: 3,
	},
	{
		codigo: "CANCELADA",
		status: 4,
		cor: "#EF4444",
		descricao: "Cancelada",
		ordem: 4,
	},
	{
		codigo: "FATURADA",
		status: 5,
		cor: "#6B7280",
		descricao: "Faturado",
		ordem: 5,
	},
	{
		codigo: "AGENDADA",
		status: 6,
		cor: "#F97316",
		descricao: "Agendada",
		ordem: 6,
	},
	{
		codigo: "PAUSADA",
		status: 7,
		cor: "#A855F7",
		descricao: "Pausada",
		ordem: 7,
	},
	{
		codigo: "MESCLADA",
		status: 8,
		cor: "#EAB308",
		descricao: "Mesclado",
		ordem: 8,
	},
	{
		codigo: "DUPLICADA",
		status: 9,
		cor: "#92400E",
		descricao: "Duplicado",
		ordem: 9,
	},
	{
		codigo: "SERVICO_NAO_EXECUTADO",
		status: 10,
		cor: "#EC4899",
		descricao: "Serviço não executado",
		ordem: 10,
	},
	{
		codigo: "ORCAMENTO",
		status: 11,
		cor: "#06B6D4",
		descricao: "Orçamento",
		ordem: 11,
	},
	{
		codigo: "FATURADA_PARCIALMENTE",
		status: 12,
		cor: "#6366F1",
		descricao: "Faturada parcialmente",
		ordem: 12,
	},
	{
		codigo: "RETIRADA",
		status: 13,
		cor: "#14B8A6",
		descricao: "Retirada",
		ordem: 13,
	},
];

const TRANSICOES: Record<OrdemServicoStatusCodigo, OrdemServicoStatusCodigo[]> =
	{
		ABERTA: [
			"AGENDADA",
			"ORCAMENTO",
			"EM_EXECUCAO",
			"CANCELADA",
			"MESCLADA",
			"DUPLICADA",
			"FATURADA",
			"FATURADA_PARCIALMENTE",
			"FINALIZADA",
		],
		AGENDADA: [
			"ABERTA",
			"EM_EXECUCAO",
			"CANCELADA",
			"ORCAMENTO",
			"FATURADA",
			"FATURADA_PARCIALMENTE",
		],
		ORCAMENTO: [
			"ABERTA",
			"EM_EXECUCAO",
			"CANCELADA",
			"AGENDADA",
			"FATURADA",
			"FATURADA_PARCIALMENTE",
		],
		EM_EXECUCAO: [
			"PAUSADA",
			"FINALIZADA",
			"SERVICO_NAO_EXECUTADO",
			"CANCELADA",
			"FATURADA",
			"FATURADA_PARCIALMENTE",
		],
		PAUSADA: [
			"EM_EXECUCAO",
			"CANCELADA",
			"SERVICO_NAO_EXECUTADO",
			"FATURADA",
			"FATURADA_PARCIALMENTE",
		],
		FINALIZADA: ["FATURADA", "FATURADA_PARCIALMENTE", "RETIRADA", "CANCELADA"],
		SERVICO_NAO_EXECUTADO: ["EM_EXECUCAO", "CANCELADA", "RETIRADA"],
		FATURADA_PARCIALMENTE: ["FATURADA", "RETIRADA"],
		FATURADA: ["RETIRADA"],
		RETIRADA: [],
		CANCELADA: [],
		MESCLADA: [],
		DUPLICADA: ["ABERTA", "ORCAMENTO", "EM_EXECUCAO"],
	};

export function podeTransicionarStatus(
	de: OrdemServicoStatusCodigo,
	para: OrdemServicoStatusCodigo,
): boolean {
	if (de === para) return true;
	return TRANSICOES[de]?.includes(para) ?? false;
}

export function obterStatusPadraoPorNumero(
	status: number | null | undefined,
): OrdemServicoStatusPadrao | undefined {
	if (status == null) return undefined;
	return ORDEM_SERVICO_STATUS_PADRAO.find((item) => item.status === status);
}

export const HEX_COR_REGEX = /^#[0-9A-Fa-f]{6}$/;
