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
	codigo?: number | null;
	idgrupo: string | null;
	idgrupogourmet?: string | null;
	espizza?: number | null;
	imagem?: string | null;
	caminhoimagem?: string | null;
};

export type LeituraCodigoBarras = {
	produto: ProdutoLocal;
	quantidade: number;
	precounitario: number;
	precototal: number;
	pesado: boolean;
	origem: "etiqueta-balanca" | "ean" | "nome";
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

export type PagamentosResumoTurno = {
	dinheiro: number;
	cartao: number;
	pix: number;
	prepago: number;
	total: number;
};

export type ResumoTurnoCaixa = {
	qtdVendas: number;
	pagamentos: PagamentosResumoTurno;
	totalVendas: number;
	suprimento: number;
	saldoapurado: number;
	saldoCaixaFisico: number;
};

export type StatusLancamentoPagamento = "ok" | "pendente" | "cancelado";

export type LancamentoPagamento = {
	id?: string;
	meio: MeioPagamento;
	valor: number;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	status?: StatusLancamentoPagamento;
};

export type SitefStatus = {
	habilitado: boolean;
	disponivel: boolean;
	plataforma: string;
	dllEncontrada: boolean;
	dllPath: string | null;
	portaPinPad?: string | null;
	mensagem: string;
};

export type SitefPagarResultado = {
	ok: boolean;
	manual: boolean;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	mensagem?: string;
};

export type SitefCancelarResultado = {
	ok: boolean;
	manual: boolean;
	mensagem?: string;
};

export type ModeloAtendimento = "mesa" | "comanda";

export type StatusPdv = {
	online: boolean;
	outboxPendentes: number;
	podeConfigurar: boolean;
	moduloGourmet: boolean;
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
		idusuario?: string | null;
		username?: string | null;
		idremoto?: string | null;
	} | null;
	caixaOutroOperador?: {
		username: string | null;
		abertoem: string;
	} | null;
	numeropdv: number;
	emitirNfce: boolean;
	modeloAtendimento: ModeloAtendimento;
	qtdMesas: number;
	modo?: "principal" | "secundario";
	principalOnline?: boolean | null;
	principalErro?: string | null;
	balancaHabilitada?: boolean;
};

export type BalancaStatus = {
	habilitado: boolean;
	porta: string;
	baud: number;
	protocolo: string;
	conectado: boolean;
	mensagem: string;
};

export type BalancaPeso = {
	peso: number;
	conectado: boolean;
	origem: "balanca" | "nenhuma";
	mensagem: string;
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

export function rotaHomePdv(status: StatusPdv | null | undefined): string {
	return status?.moduloGourmet ? "/" : "/balcao";
}
