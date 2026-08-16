export type GrupoLocal = {
	id: string;
	nome: string;
};

export type ProdutoLocal = {
	id: string;
	descricao: string;
	preco: number;
	unidademedida: string | null;
	idunidademedida: string | null;
	ean: string | null;
	idgrupo: string | null;
	idgrupogourmet?: string | null;
	espizza?: number | null;
	imagem?: string | null;
	caminhoimagem?: string | null;
};

export type StatusAtividadeMesa = "livre" | "consumindo" | "ociosa";

export type MesaResumo = {
	numero: number;
	status: string;
	idconta: string | null;
	nomecliente: string | null;
	valortotal: number;
	abertoem: string | null;
	ultimoLancamento: string | null;
	statusAtividade: StatusAtividadeMesa;
	qtdItens: number;
};

export type MesaConsulta = {
	numero: number;
	status: string;
	idconta: string | null;
	nomecliente: string | null;
	valortotal: number;
	qtdItens: number;
};

export type MeioPagamento = "DINHEIRO" | "PIX" | "CARTAO";

export type ModeloAtendimento = "mesa" | "comanda";

export type StatusPdv = {
	online: boolean;
	outboxPendentes: number;
	sessao: {
		logado: boolean;
		username: string | null;
		idempresa: string | null;
		nomeempresa: string | null;
	};
	caixa: {
		id: string;
		numeropdv: number;
		abertoem: string;
		valorabertura: number;
	} | null;
	numeropdv: number;
	emitirNfce: boolean;
	modeloAtendimento: ModeloAtendimento;
	qtdMesas: number;
};

export type StatusContext = {
	status: StatusPdv | null;
	refresh: () => Promise<void>;
};

/** Rótulos (singular/plural) usados nas telas conforme o modelo de atendimento configurado. */
export function rotuloModelo(modelo: ModeloAtendimento | undefined) {
	if (modelo === "comanda") {
		return { singular: "Comanda", plural: "Comandas" };
	}
	return { singular: "Mesa", plural: "Mesas" };
}
