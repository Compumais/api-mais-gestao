export type CnaeConsultaCnpj = {
	cnae: string;
	descricao: string;
};

export type SocioConsultaCnpj = {
	nomeSocio: string;
	descricao: string;
	identificadorSocio: number | null;
	cnpjCpfSocio: string | null;
	dataEntradaSociedade: string | null;
	nomeRepresentante: string | null;
	faixaEtaria: string | null;
};

export type OpenCnpjDados = {
	cnpj: string;
	situacaoCadastral: string;
	dataSituacaoCadastral: string | null;
	motivoSituacaoCadastral: string | null;
	razaoSocial: string;
	nomeFantasia: string | null;
	dataInicioAtividades: string | null;
	matriz: string | null;
	naturezaJuridica: string | null;
	capitalSocial: number | null;
	email: string | null;
	telefone: string | null;
	logradouro: string | null;
	numero: string | null;
	complemento: string | null;
	bairro: string | null;
	municipio: string | null;
	uf: string | null;
	cep: string | null;
	dataSituacaoEspecial: string | null;
	situacaoEspecial: string | null;
	opcaoSimples: string | null;
	opcaoMei: string | null;
	cnaes: CnaeConsultaCnpj[];
	socios: SocioConsultaCnpj[];
};

export type OpenCnpjResposta = {
	success: boolean;
	message: string | null;
	data: OpenCnpjDados | null;
};

export type EntidadeConsultaCnpj = {
	cnpjcpf: string;
	nome: string;
	razaosocial: string | null;
	tipopessoa: 1;
	email: string | null;
	telefone: string | null;
	endereco: string | null;
	numeroendereco: string | null;
	complemento: string | null;
	bairro: string | null;
	cep: string | null;
	cidade: string | null;
	estado: string | null;
	idestado: string | null;
	idcidade: string | null;
	indiedest: number | null;
};

export type ExtrasConsultaCnpj = {
	situacaoCadastral: string;
	dataSituacaoCadastral: string | null;
	dataInicioAtividades: string | null;
	naturezaJuridica: string | null;
	capitalSocial: number | null;
	opcaoSimples: string | null;
	opcaoMei: string | null;
	cnaes: CnaeConsultaCnpj[];
	socios: SocioConsultaCnpj[];
};

export type ConsultaCnpjEntidade = {
	entidade: EntidadeConsultaCnpj;
	extras: ExtrasConsultaCnpj;
	jaCadastrada: { id: string } | null;
};
