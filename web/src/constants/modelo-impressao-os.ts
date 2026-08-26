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
	servicoRealizado: "Serviço realizado",
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
	{ value: "enderecocompleto", label: "Endereço completo" },
	{ value: "telefone", label: "Telefone" },
	{ value: "email", label: "E-mail" },
	{ value: "inscricaoestadual", label: "Inscrição estadual" },
] as const;

export const CAMPOS_CLIENTE_OS_PADRAO = CAMPOS_CLIENTE_OS.map((c) => c.value);

export const CAMPOS_VEICULO_OS = [
	{ value: "marca", label: "Marca" },
	{ value: "modelo", label: "Modelo" },
	{ value: "placa", label: "Placa" },
	{ value: "renavam", label: "RENAVAM" },
] as const;

export const CAMPOS_SERVICO_REALIZADO_OS = [
	{ value: "servicoexecutado", label: "Serviço realizado" },
	{ value: "serviconaoexecutado", label: "Serviço não realizado" },
] as const;

export const CAMPOS_SERVICO_REALIZADO_OS_PADRAO = CAMPOS_SERVICO_REALIZADO_OS.map(
	(c) => c.value,
);

export const OPCOES_COLUNA_BLOCO = [
	{ value: "cheia", label: "Largura total" },
	{ value: "esquerda", label: "Coluna 1" },
	{ value: "direita", label: "Coluna 2" },
] as const;
