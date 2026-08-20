import type { TipoBlocoModeloImpressaoPedido } from "@/schemas/modelo-impressao-pedido.schema";

export const LABELS_BLOCO_MODELO_IMPRESSAO_PEDIDO: Record<
	TipoBlocoModeloImpressaoPedido,
	string
> = {
	cabecalhoEmpresa: "Cabeçalho da empresa",
	titulo: "Título",
	textoLivre: "Texto livre",
	dadosPedido: "Dados do pedido",
	cliente: "Cliente",
	observacao: "Observação",
	itens: "Itens",
	totais: "Totais",
	assinaturas: "Assinaturas",
	rodape: "Rodapé",
};

export const CAMPOS_DADOS_PEDIDO = [
	{ value: "codigo", label: "Código" },
	{ value: "status", label: "Status" },
	{ value: "data", label: "Data" },
] as const;

export const CAMPOS_CLIENTE_PEDIDO = [
	{ value: "nomecliente", label: "Nome" },
	{ value: "cnpjcpfcliente", label: "CNPJ/CPF" },
] as const;
