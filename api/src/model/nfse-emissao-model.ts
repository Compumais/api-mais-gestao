import type { NfseProvedor } from "@/constants/nfse-emissao.js";

export type NfseConfiguracao = {
	id: string;
	idempresa: string;
	ambiente: number;
	provedor: NfseProvedor | string;
	codigomunicipioibge: string | null;
	versaolayout: string;
	urlwsdl: string | null;
	usarlotesincrono: boolean;
	idcertificadoativo: string | null;
	ultimaidserie: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type NfseSerie = {
	id: string;
	idempresa: string;
	serie: string;
	numeroproximo: number;
	padrao: boolean;
	ativo: boolean;
	criadoem: string;
	atualizadoem: string;
};

export type EnderecoPayloadNfse = {
	logradouro?: string;
	numero?: string;
	complemento?: string;
	bairro?: string;
	codigoMunicipioIbge?: string;
	uf?: string;
	cep?: string;
};

export type PrestadorPayloadNfse = {
	cnpj: string;
	im: string;
	municipioIbge: string;
	razaoSocial?: string;
	optanteSimplesNacional?: string;
	incentivoFiscal?: string;
};

export type TomadorPayloadNfse = {
	cnpjCpf?: string;
	razaoSocial?: string;
	email?: string;
	endereco?: EnderecoPayloadNfse;
};

export type RpsPayloadNfse = {
	numero: number;
	serie: string;
	tipo?: string;
	dataEmissao: string;
	competencia: string;
};

export type ValoresServicoPayloadNfse = {
	servicos: number;
	deducoes?: number;
	pis?: number;
	cofins?: number;
	inss?: number;
	ir?: number;
	csll?: number;
	outrasRetencoes?: number;
	iss?: number;
	aliquota?: number;
	descontoIncondicionado?: number;
	descontoCondicionado?: number;
};

export type ServicoPayloadNfse = {
	itemListaServico: string;
	discriminacao: string;
	codigoCnae?: string;
	codigoTributacaoMunicipio?: string;
	codigoMunicipioIncidencia?: string;
	exigibilidadeIss?: string;
	issRetido?: string;
	valores: ValoresServicoPayloadNfse;
};

export type ItemPayloadNfse = {
	descricao: string;
	quantidade: number;
	valorUnitario: number;
	codigoListaLc11603?: string;
};

export type PayloadNfse = {
	prestador: PrestadorPayloadNfse;
	tomador: TomadorPayloadNfse;
	rps: RpsPayloadNfse;
	servico: ServicoPayloadNfse;
	itens?: ItemPayloadNfse[];
};

export type NfseGatewayErro = {
	codigo: string;
	mensagem: string;
};

export type NfseGatewayRespostaBase = {
	sucesso: boolean;
	erro?: string;
};

export type NfseGatewayEmissaoResposta = NfseGatewayRespostaBase & {
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	protocolo?: string | null;
	xml?: string | null;
	xmlEnviado?: string | null;
	erros?: NfseGatewayErro[];
	provedor?: string;
};

export type NfseGatewayCancelamentoResposta = NfseGatewayEmissaoResposta;

export type NfseGatewayConsultaResposta = NfseGatewayEmissaoResposta;

export type DadosEmissaoNfseSalvos = {
	idordemservico?: string;
	gerarFinanceiro?: boolean;
	idplanocontas?: string;
	idcondicaopagto?: string;
	idtipodocumento?: string;
	formasPagamento?: Array<{
		idtipodocumentofinanceiro: string;
		valor: number;
		indPag?: number;
	}>;
	payload?: PayloadNfse;
};
