import { v4 as uuidv4 } from "uuid";
import type { LayoutModeloImpressaoPedido } from "@/repositories/schema.js";

function bloco(
	tipo: LayoutModeloImpressaoPedido[number]["tipo"],
	props?: LayoutModeloImpressaoPedido[number]["props"],
): LayoutModeloImpressaoPedido[number] {
	return { id: uuidv4(), tipo, props };
}

export function layoutModeloCompletoPedido(): LayoutModeloImpressaoPedido {
	return [
		bloco("cabecalhoEmpresa"),
		bloco("titulo", { titulo: "Pedido" }),
		bloco("dadosPedido", {
			campos: ["codigo", "status", "data"],
		}),
		bloco("cliente", {
			campos: ["nomecliente", "cnpjcpfcliente"],
		}),
		bloco("itens"),
		bloco("totais"),
		bloco("observacao"),
		bloco("assinaturas"),
		bloco("rodape"),
	];
}

export function layoutModeloResumidoPedido(): LayoutModeloImpressaoPedido {
	return [
		bloco("cabecalhoEmpresa"),
		bloco("titulo", { titulo: "Pedido" }),
		bloco("dadosPedido", {
			campos: ["codigo", "status", "data"],
		}),
		bloco("cliente", {
			campos: ["nomecliente", "cnpjcpfcliente"],
		}),
		bloco("totais"),
		bloco("assinaturas"),
	];
}

export const SEEDS_MODELO_IMPRESSAO_PEDIDO = [
	{
		nome: "Completo",
		descricao: "Modelo padrão com dados, cliente, itens e totais",
		layout: layoutModeloCompletoPedido,
		primario: true,
	},
	{
		nome: "Resumido",
		descricao: "Modelo compacto com cabeçalho, dados essenciais e totais",
		layout: layoutModeloResumidoPedido,
		primario: false,
	},
] as const;
