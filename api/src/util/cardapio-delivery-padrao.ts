import type { CampoFinalizacao } from "@/model/cardapio-delivery-tipos.js";

export const CAMPOS_FINALIZACAO_PADRAO: CampoFinalizacao[] = [
	{
		id: "modalidade",
		tipo: "modalidade",
		rotulo: "Tipo de pedido",
		obrigatorio: 1,
		ordem: 0,
	},
	{
		id: "endereco",
		tipo: "endereco",
		rotulo: "Endereço",
		obrigatorio: 1,
		ordem: 1,
		condicao: { campoid: "modalidade", valor: "delivery" },
	},
	{
		id: "pagamento",
		tipo: "pagamento",
		rotulo: "Forma de pagamento",
		obrigatorio: 1,
		ordem: 2,
	},
	{
		id: "observacao",
		tipo: "observacao",
		rotulo: "Observação",
		obrigatorio: 0,
		ordem: 3,
	},
];

export const HORARIO_PADRAO = {
	ativo: 0,
	modo: "simples" as const,
	timezone: "America/Sao_Paulo",
	inicio: "18:00",
	fim: "23:00",
	semanal: {},
	datasfechadas: [] as string[],
	mensagem:
		"No momento não estamos aceitando pedidos. Confira nosso horário de funcionamento.",
};
