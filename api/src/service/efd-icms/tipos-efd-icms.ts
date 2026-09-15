export type FinalidadeEfd = "0" | "1";

export type GerarEfdIcmsParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	finalidade?: FinalidadeEfd;
	incluirInventario?: boolean;
	dataInventario?: string;
};

export type ContribuinteEfd = {
	cnpj: string;
	inscricaoEstadual: string;
	inscricaoMunicipal: string | null;
	razaosocial: string;
	nomefantasia: string | null;
	uf: string;
	codigoMunicipioIbge: string | null;
	logradouro: string | null;
	numero: string | null;
	complemento: string | null;
	bairro: string | null;
	cep: string | null;
	telefone: string | null;
	email: string | null;
	crt: number | null;
	indperfil: "A" | "B" | "C";
	indativ: 0 | 1;
	cnae: string | null;
};

export type ParticipanteEfd = {
	codigo: string;
	nome: string;
	cnpjCpf: string;
	inscricaoEstadual: string | null;
	codigoMunicipio: string | null;
	endereco: string | null;
	numero: string | null;
	complemento: string | null;
	bairro: string | null;
	pais: string | null;
};

export type UnidadeEfd = {
	codigo: string;
	descricao: string;
};

export type ProdutoEfd = {
	codigo: string;
	descricao: string;
	barra: string | null;
	unidade: string;
	tipoItem: string;
	ncm: string | null;
	cest: string | null;
	aliquotaIcms: string | null;
};

export type NotaEfd = {
	id: string;
	tipoorigem: number | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	chave: string | null;
	emissao: string | null;
	dataEntradaSaida: string | null;
	codigoParticipante: string | null;
	valorDocumento: string | null;
	valorMercadoria: string | null;
	desconto: string | null;
	frete: string | null;
	seguro: string | null;
	outrasDespesas: string | null;
	baseIcms: string | null;
	valorIcms: string | null;
	baseIcmsSt: string | null;
	valorIcmsSt: string | null;
	valorIpi: string | null;
	valorPis: string | null;
	valorCofins: string | null;
	indFrete: number | null;
	status: number | null;
	cancelada: boolean;
};

export type ItemEfd = {
	id: string;
	idnotafiscal: string;
	numeroItem: number;
	codigoProduto: string | null;
	descricao: string | null;
	unidade: string | null;
	quantidade: string | null;
	valorItem: string | null;
	desconto: string | null;
	cfop: string | null;
	cstIcms: string | null;
	csosn: string | null;
	origem: number | null;
	baseIcms: string | null;
	aliquotaIcms: string | null;
	valorIcms: string | null;
	baseIcmsSt: string | null;
	aliquotaIcmsSt: string | null;
	valorIcmsSt: string | null;
	cstIpi: string | null;
	valorIpi: string | null;
	cstPis: string | null;
	basePis: string | null;
	aliquotaPis: string | null;
	valorPis: string | null;
	cstCofins: string | null;
	baseCofins: string | null;
	aliquotaCofins: string | null;
	valorCofins: string | null;
};

export type InventarioEfd = {
	codigoProduto: string;
	unidade: string | null;
	quantidade: string;
	valorUnitario: string;
	valorTotal: string;
	indicadorPosse: string;
};

export type AjusteApuracaoEfd = {
	codigoajuste: string;
	descricao: string | null;
	valor: string;
	natureza: "debito" | "credito";
	tipo: "icms" | "pis" | "cofins";
};

export type ResultadoValidacaoEfd = {
	erros: string[];
	alertas: string[];
};

export type ResultadoGeracaoEfd = {
	conteudo: string;
	filename: string;
	alertas: string[];
	totalLinhas: number;
};
