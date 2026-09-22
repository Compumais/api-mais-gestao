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
	maisPedidos: CardapioPublicoProduto[];
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

export type MeuPedidoCardapio = {
	id: string;
	protocolo: string;
	status: string;
	modalidade: string;
	total: number;
	criadoem: string;
	itens: Array<{
		idproduto: string;
		quantidade: number;
		nomeproduto: string;
		idprodutomeio: string | null;
		precototal: number;
	}>;
};

const chaveTelefone = (slug: string) => `cardapio:${slug}:telefone`;
const chaveNome = (slug: string) => `cardapio:${slug}:nome`;
const cookieTelefone = (slug: string) =>
	`cardapio_tel_${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const COOKIE_TELEFONE_MAX_AGE = 60 * 60 * 24 * 180; // 180 dias

function lerCookie(nome: string): string {
	if (typeof document === "undefined") return "";
	const alvo = `${nome}=`;
	const partes = document.cookie.split(";");
	for (const parte of partes) {
		const item = parte.trim();
		if (item.startsWith(alvo)) {
			return decodeURIComponent(item.slice(alvo.length));
		}
	}
	return "";
}

function gravarCookie(nome: string, valor: string, maxAge = COOKIE_TELEFONE_MAX_AGE) {
	if (typeof document === "undefined") return;
	document.cookie = `${nome}=${encodeURIComponent(valor)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export const cardapioPublicoService = {
	async buscar(slug: string): Promise<CardapioPublico> {
		const { data } = await api.get<CardapioPublico>(
			`/publico/cardapio/${slug}`,
		);
		return {
			...data,
			maisPedidos: data.maisPedidos ?? [],
		};
	},

	async listarMeusPedidos(
		slug: string,
		telefone: string,
	): Promise<MeuPedidoCardapio[]> {
		const { data } = await api.get<{ pedidos: MeuPedidoCardapio[] }>(
			`/publico/cardapio/${slug}/meus-pedidos`,
			{ params: { telefone } },
		);
		return data.pedidos ?? [];
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

	lerClienteLocal(slug: string): { nome: string; telefone: string } {
		if (typeof window === "undefined") return { nome: "", telefone: "" };
		try {
			const telefoneCookie = lerCookie(cookieTelefone(slug)).replace(/\D/g, "");
			const telefoneLocal =
				localStorage.getItem(chaveTelefone(slug))?.replace(/\D/g, "") ?? "";
			const telefone = telefoneCookie || telefoneLocal;
			// Migra telefone antigo do localStorage para cookie
			if (telefone && !telefoneCookie) {
				gravarCookie(cookieTelefone(slug), telefone);
			}
			return {
				nome: localStorage.getItem(chaveNome(slug)) ?? "",
				telefone,
			};
		} catch {
			return { nome: "", telefone: "" };
		}
	},

	salvarClienteLocal(slug: string, nome: string, telefone: string) {
		if (typeof window === "undefined") return;
		const digitos = telefone.replace(/\D/g, "");
		try {
			localStorage.setItem(chaveNome(slug), nome);
			localStorage.setItem(chaveTelefone(slug), digitos);
		} catch {
			// ignore quota / private mode
		}
		if (digitos) {
			gravarCookie(cookieTelefone(slug), digitos);
		}
	},

	salvarTelefoneCookie(slug: string, telefone: string) {
		if (typeof window === "undefined") return;
		const digitos = telefone.replace(/\D/g, "");
		if (!digitos) return;
		gravarCookie(cookieTelefone(slug), digitos);
		try {
			localStorage.setItem(chaveTelefone(slug), digitos);
		} catch {
			// ignore
		}
	},
};

export function urlMidiaCardapio(
	caminho: string | null | undefined,
): string | null {
	if (!caminho) return null;
	if (caminho.startsWith("http")) return caminho;
	const base = process.env.NEXT_PUBLIC_API_URL ?? "";
	return `${base}${caminho}`;
}
