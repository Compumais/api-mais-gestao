import type {
	AcaoExecutada,
	ContextoTool,
	DefinicaoTool,
	ResultadoTool,
} from "./tipos.js";
import { toolsClientes } from "./clientes.js";
import { toolsContabilidade } from "./contabilidade.js";
import { toolsDashboard } from "./dashboard.js";
import { toolsFiscal } from "./fiscal.js";
import { toolsPedidos } from "./pedidos.js";
import { toolsRelatorios } from "./relatorios.js";
import { zodParaJsonSchema } from "./util-tools.js";

const TOOLS: DefinicaoTool[] = [
	...toolsDashboard,
	...toolsClientes,
	...toolsPedidos,
	...toolsFiscal,
	...toolsRelatorios,
	...toolsContabilidade,
];

const mapaTools = new Map(TOOLS.map((t) => [t.nome, t]));

export function listarTools(): DefinicaoTool[] {
	return TOOLS;
}

export function obterTool(nome: string): DefinicaoTool | undefined {
	return mapaTools.get(nome);
}

export function toolsParaOpenAI() {
	return TOOLS.map((tool) => ({
		type: "function" as const,
		function: {
			name: tool.nome,
			description: tool.descricao,
			parameters: zodParaJsonSchema(tool.schema),
		},
	}));
}

export function toolsParaGemini() {
	return [
		{
			functionDeclarations: TOOLS.map((tool) => ({
				name: tool.nome,
				description: tool.descricao,
				parameters: zodParaJsonSchema(tool.schema),
			})),
		},
	];
}

export async function executarToolPorNome(
	nome: string,
	ctx: ContextoTool,
	argsBrutos: unknown,
): Promise<{ resultado: ResultadoTool; acao: AcaoExecutada }> {
	const tool = obterTool(nome);
	if (!tool) {
		const resultado: ResultadoTool = {
			ok: false,
			resumo: `Ferramenta desconhecida: ${nome}`,
		};
		return {
			resultado,
			acao: { nome, status: "erro", resumo: resultado.resumo },
		};
	}

	const parsed = tool.schema.safeParse(argsBrutos ?? {});
	if (!parsed.success) {
		const resultado: ResultadoTool = {
			ok: false,
			resumo: `Argumentos inválidos: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
		};
		return {
			resultado,
			acao: { nome, status: "erro", resumo: resultado.resumo },
		};
	}

	const args = parsed.data as Record<string, unknown>;

	if (tool.mutavel && args.confirmado !== true) {
		const resultado: ResultadoTool = {
			ok: false,
			resumo:
				"Confirmação necessária. Pergunte ao usuário e só execute novamente com confirmado=true após o aceite explícito.",
		};
		return {
			resultado,
			acao: { nome, status: "bloqueado", resumo: resultado.resumo },
		};
	}

	try {
		const resultado = await tool.executar(ctx, args);
		return {
			resultado,
			acao: {
				nome,
				status: resultado.ok ? "sucesso" : "erro",
				resumo: resultado.resumo,
			},
		};
	} catch (error) {
		const resultado: ResultadoTool = {
			ok: false,
			resumo:
				error instanceof Error
					? error.message
					: "Erro inesperado ao executar ferramenta",
		};
		return {
			resultado,
			acao: { nome, status: "erro", resumo: resultado.resumo },
		};
	}
}
