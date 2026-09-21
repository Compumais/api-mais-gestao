import { api } from "@/lib/axios";

export type BairroEntrega = {
	nome: string;
	taxa: number;
};

export type CampoFinalizacao = {
	id: string;
	tipo:
		| "modalidade"
		| "endereco"
		| "pagamento"
		| "documento"
		| "observacao"
		| "texto"
		| "select";
	rotulo: string;
	obrigatorio: number;
	ordem: number;
	opcoes?: string[];
	condicao?: { campoid: string; valor: string } | null;
};

export type HorarioCardapio = {
	ativo: number;
	modo: "simples" | "semanal";
	timezone: string;
	inicio: string | null;
	fim: string | null;
	semanal: Record<
		string,
		{ ativo: boolean; inicio: string; fim: string } | undefined
	>;
	datasfechadas: string[];
	mensagem: string | null;
};

export type CardapioDelivery = {
	id: string;
	idempresa: string;
	slug: string;
	ativo: number;
	corprimaria: string | null;
	logourl: string | null;
	bannerurl: string | null;
	habilitadelivery: number;
	habilitaretirada: number;
	taxaentregapadrao: string | null;
	bairrosentrega: BairroEntrega[];
	pedidominimo: string | null;
	chavepix: string | null;
	tempomedioentrega: string | null;
	mensagemrodape: string | null;
	horario: HorarioCardapio;
	camposfinalizacao: CampoFinalizacao[];
	idmeiospagamento: string[];
};

export type AtualizarCardapioDeliveryData = Partial<{
	slug: string;
	ativo: number;
	corprimaria: string | null;
	habilitadelivery: number;
	habilitaretirada: number;
	taxaentregapadrao: string;
	bairrosentrega: BairroEntrega[];
	pedidominimo: string;
	chavepix: string | null;
	tempomedioentrega: string | null;
	mensagemrodape: string | null;
	horario: HorarioCardapio;
	camposfinalizacao: CampoFinalizacao[];
	idmeiospagamento: string[];
}>;

export const cardapioDeliveryService = {
	async buscar(idempresa: string): Promise<CardapioDelivery> {
		const { data } = await api.get<CardapioDelivery>("/cardapio-delivery", {
			params: { idempresa },
		});
		return data;
	},

	async atualizar(
		idempresa: string,
		dados: AtualizarCardapioDeliveryData,
	): Promise<CardapioDelivery> {
		const { data } = await api.put<CardapioDelivery>("/cardapio-delivery", dados, {
			params: { idempresa },
		});
		return data;
	},

	async enviarImagem(
		idempresa: string,
		tipo: "logo" | "banner",
		arquivo: File,
	): Promise<CardapioDelivery> {
		const { data } = await api.put<CardapioDelivery>(
			`/cardapio-delivery/${tipo}`,
			arquivo,
			{
				params: { idempresa },
				headers: { "Content-Type": arquivo.type },
			},
		);
		return data;
	},

	async removerImagem(
		idempresa: string,
		tipo: "logo" | "banner",
	): Promise<CardapioDelivery> {
		const { data } = await api.delete<CardapioDelivery>(
			`/cardapio-delivery/${tipo}`,
			{ params: { idempresa } },
		);
		return data;
	},
};
