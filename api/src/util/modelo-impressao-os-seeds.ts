import { v4 as uuidv4 } from "uuid";
import type { LayoutModeloImpressaoOs } from "@/repositories/schema.js";

function bloco(
	tipo: LayoutModeloImpressaoOs[number]["tipo"],
	props?: LayoutModeloImpressaoOs[number]["props"],
	coluna?: LayoutModeloImpressaoOs[number]["coluna"],
): LayoutModeloImpressaoOs[number] {
	return { id: uuidv4(), tipo, props, coluna };
}

const CAMPOS_CLIENTE_PADRAO = [
	"nomecliente",
	"cnpjcpfcliente",
	"enderecocompleto",
	"telefone",
	"email",
	"inscricaoestadual",
];

export function layoutModeloCompletoOs(): LayoutModeloImpressaoOs {
	return [
		bloco("cabecalhoEmpresa"),
		bloco("titulo", { titulo: "Ordem de Serviço" }),
		bloco(
			"dadosOs",
			{
				campos: [
					"codigo",
					"status",
					"dataos",
					"agendamento",
					"previsaoconclusao",
				],
			},
			"esquerda",
		),
		bloco("cliente", { campos: [...CAMPOS_CLIENTE_PADRAO] }, "direita"),
		bloco("problema"),
		bloco("servicoRealizado"),
		bloco("itens", { mostrarResponsavel: false }),
		bloco("totais"),
		bloco("observacao"),
		bloco("assinaturas"),
		bloco("rodape"),
	];
}

export function layoutModeloResumidoOs(): LayoutModeloImpressaoOs {
	return [
		bloco("cabecalhoEmpresa"),
		bloco("titulo", { titulo: "Ordem de Serviço" }),
		bloco(
			"dadosOs",
			{ campos: ["codigo", "status", "dataos"] },
			"esquerda",
		),
		bloco("cliente", { campos: [...CAMPOS_CLIENTE_PADRAO] }, "direita"),
		bloco("totais"),
		bloco("assinaturas"),
	];
}

export const SEEDS_MODELO_IMPRESSAO_OS = [
	{
		nome: "Completo",
		descricao: "Modelo padrão com dados, cliente, problema, itens e totais",
		layout: layoutModeloCompletoOs,
		primario: true,
	},
	{
		nome: "Resumido",
		descricao: "Modelo compacto com cabeçalho, dados essenciais e totais",
		layout: layoutModeloResumidoOs,
		primario: false,
	},
] as const;
