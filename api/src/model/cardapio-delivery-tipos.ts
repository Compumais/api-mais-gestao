export type CampoFinalizacaoTipo =
	| "modalidade"
	| "endereco"
	| "pagamento"
	| "documento"
	| "observacao"
	| "texto"
	| "select";

export type CampoFinalizacaoCondicao = {
	campoid: string;
	valor: string;
};

export type CampoFinalizacao = {
	id: string;
	tipo: CampoFinalizacaoTipo;
	rotulo: string;
	obrigatorio: number;
	ordem: number;
	opcoes?: string[];
	condicao?: CampoFinalizacaoCondicao | null;
};

export type BairroEntrega = {
	nome: string;
	taxa: number;
};

export type HorarioDia = {
	ativo: boolean;
	inicio: string;
	fim: string;
};

export type HorarioDiaChave =
	| "sunday"
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday";

export type HorarioCardapio = {
	ativo: number;
	modo: "simples" | "semanal";
	timezone: string;
	inicio: string | null;
	fim: string | null;
	semanal: Partial<Record<HorarioDiaChave, HorarioDia>>;
	datasfechadas: string[];
	mensagem: string | null;
};

export type ItemPedidoCardapio = {
	idproduto: string;
	quantidade: number;
	observacao?: string | null;
	idprodutomeio?: string | null;
	nomeproduto?: string | null;
	precounitario?: number;
	precototal?: number;
};

export type RespostaCampoCardapio = {
	campoid: string;
	valor: string;
};

export type StatusPedidoCardapio = "pendente" | "enviado_pdv" | "erro";
