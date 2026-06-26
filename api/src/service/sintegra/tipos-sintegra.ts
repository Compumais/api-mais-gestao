export type FinalidadeSintegra = "1" | "2" | "3" | "5";

export type GerarSintegraParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	finalidade?: FinalidadeSintegra;
	incluirInventario?: boolean;
	dataInventario?: string;
};

export type DadosContribuinteSintegra = {
	cnpj: string;
	inscricaoEstadual: string;
	razaosocial: string;
	municipio: string;
	uf: string;
	fax: string;
	logradouro: string;
	numero: string;
	complemento: string;
	bairro: string;
	cep: string;
	contato: string;
	telefone: string;
	crt: number | null;
	codigoMunicipioIbge: string | null;
};

export type NotaSintegra = {
	id: string;
	emissao: string | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	numeronotafiscal: string | null;
	cnpjCpf: string | null;
	inscricaoEstadual: string | null;
	uf: string | null;
	cfopCodigo: string | null;
	valorTotal: string | null;
	baseIcms: string | null;
	valorIcms: string | null;
	valorIpi: string | null;
	baseIcmsSt: string | null;
	valorIcmsSt: string | null;
	emitente: "P" | "T";
	situacao: "N" | "S" | "E" | "X";
	tipoorigem: number | null;
	cancelada: boolean;
};

export type ItemNotaSintegra = {
	id: string;
	idnotafiscal: string;
	numeroItem: number;
	cnpjCpf: string | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	cfop: string | null;
	cst: string | null;
	csosn: string | null;
	codigoProduto: string | null;
	quantidade: string | null;
	valorProduto: string | null;
	desconto: string | null;
	baseIcms: string | null;
	baseIcmsSt: string | null;
	valorIpi: string | null;
	aliquotaIcms: string | null;
};

export type ProdutoSintegra = {
	codigo: string;
	descricao: string;
	ncm: string | null;
	unidade: string | null;
	aliquotaIcms: string | null;
	aliquotaIpi: string | null;
	reducaoBaseIcms: string | null;
	baseIcmsSt: string | null;
};

export type InventarioSintegra = {
	dataInventario: string;
	codigoProduto: string;
	quantidade: string;
	valorTotal: string;
	codigoPosse: "1" | "2" | "3";
	cnpjPossuidor: string | null;
	inscricaoEstadualPossuidor: string | null;
	ufPossuidor: string | null;
};

export type ResumoNfceDiarioSintegra = {
	data: string;
	modelo: string;
	serie: string;
	numeroInicial: string;
	numeroFinal: string;
	valorTotal: string;
	baseIcms: string;
	valorIcms: string;
	valorIsento: string;
	valorOutras: string;
	aliquota: string;
};

export type AgrupamentoRegistro50 = {
	nota: NotaSintegra;
	cfop: string;
	aliquota: string;
	valorTotal: number;
	baseIcms: number;
	valorIcms: number;
	valorIsento: number;
	valorOutras: number;
};

export type ResultadoValidacaoSintegra = {
	erros: string[];
	alertas: string[];
};

export type ResultadoGeracaoSintegra = {
	conteudo: string;
	filename: string;
	alertas: string[];
	totalLinhas: number;
};
