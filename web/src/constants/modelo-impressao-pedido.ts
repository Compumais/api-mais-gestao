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
	{ value: "enderecocompleto", label: "Endereço completo" },
	{ value: "telefone", label: "Telefone" },
	{ value: "email", label: "E-mail" },
	{ value: "inscricaoestadual", label: "Inscrição estadual" },
] as const;

export const CAMPOS_CLIENTE_PEDIDO_PADRAO = CAMPOS_CLIENTE_PEDIDO.map(
	(c) => c.value,
);

export const OPCOES_COLUNA_BLOCO_PEDIDO = [
	{ value: "cheia", label: "Largura total" },
	{ value: "esquerda", label: "Coluna 1" },
	{ value: "direita", label: "Coluna 2" },
] as const;
