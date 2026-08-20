import type { TipoBlocoModeloImpressaoOs } from "@/schemas/modelo-impressao-os.schema";

export const LABELS_BLOCO_MODELO_IMPRESSAO_OS: Record<
	TipoBlocoModeloImpressaoOs,
	string
> = {
	cabecalhoEmpresa: "Cabeçalho da empresa",
	titulo: "Título",
	textoLivre: "Texto livre",
	dadosOs: "Dados da OS",
	cliente: "Cliente",
	veiculo: "Veículo",
	problema: "Problema descrito",
	laudo: "Laudo técnico",
	observacao: "Observação",
	itens: "Itens",
	totais: "Totais",
	extras: "Campos extras",
	assinaturas: "Assinaturas",
	rodape: "Rodapé",
};

export const CAMPOS_DADOS_OS = [
	{ value: "codigo", label: "Código" },
	{ value: "status", label: "Status" },
	{ value: "dataos", label: "Data da OS" },
	{ value: "agendamento", label: "Agendamento" },
	{ value: "previsaoconclusao", label: "Previsão de conclusão" },
	{ value: "orcamento", label: "Orçamento" },
] as const;

export const CAMPOS_CLIENTE_OS = [
	{ value: "nomecliente", label: "Nome" },
	{ value: "cnpjcpfcliente", label: "CNPJ/CPF" },
] as const;

export const CAMPOS_VEICULO_OS = [
	{ value: "marca", label: "Marca" },
	{ value: "modelo", label: "Modelo" },
	{ value: "placa", label: "Placa" },
	{ value: "renavam", label: "RENAVAM" },
] as const;
