import { api } from "@/lib/axios";
import type {
	BairroEntrega,
	CampoFinalizacao,
	HorarioCardapio,
} from "@/services/cardapio-delivery.service";

export type CardapioPublicoMeio = {
	id: string;
	descricao: string;
	formapagamentonfe: string | null;
};

export type CardapioPublicoGrupo = {
	id: string;
	nome: string;
	imagemurl: string | null;
};

export type CardapioPublicoProduto = {
	id: string;
	descricao: string;
	observacoes: string | null;
	preco: number;
	espizza: number;
	idgrupogourmet: string;
	imagemurl: string | null;
};

export type CardapioPublico = {
	nome: string;
	slug: string;
	corprimaria: string;
	logourl: string | null;
	bannerurl: string | null;
	habilitadelivery: number;
	habilitaretirada: number;
	taxaentregapadrao: number;
	bairrosentrega: BairroEntrega[];
	pedidominimo: number;
	chavepix: string | null;
	tempomedioentrega: string | null;
	mensagemrodape: string | null;
	horario: HorarioCardapio;
	aberto: boolean;
	mensagemhorario: string;
	camposfinalizacao: CampoFinalizacao[];
	meiospagamento: CardapioPublicoMeio[];
	grupos: CardapioPublicoGrupo[];
	produtos: CardapioPublicoProduto[];
};

export type PedidoCardapioPublicoCriado = {
	id: string;
	protocolo: string;
	status: string;
	total: number;
	subtotal: number;
	valorentrega: number;
	modalidade: string;
	pixCopiaCola: string | null;
	chavepix: string | null;
};

export const cardapioPublicoService = {
	async buscar(slug: string): Promise<CardapioPublico> {
		const { data } = await api.get<CardapioPublico>(
			`/publico/cardapio/${slug}`,
		);
		return data;
	},

	async enviarPedido(
		slug: string,
		payload: {
			clientorderid: string;
			nomecliente: string;
			telefone: string;
			respostas: Array<{ campoid: string; valor: string }>;
			itens: Array<{
				idproduto: string;
				quantidade: number;
				observacao?: string | null;
				idprodutomeio?: string | null;
			}>;
		},
	): Promise<PedidoCardapioPublicoCriado> {
		const { data } = await api.post<PedidoCardapioPublicoCriado>(
			`/publico/cardapio/${slug}/pedidos`,
			payload,
		);
		return data;
	},
};

export function urlMidiaCardapio(caminho: string | null | undefined): string | null {
	if (!caminho) return null;
	if (caminho.startsWith("http")) return caminho;
	const base = process.env.NEXT_PUBLIC_API_URL ?? "";
	return `${base}${caminho}`;
}
