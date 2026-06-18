export type Estado = {
	idestado: string;
	nome: string;
	codigoIbge: string;
};

export type Municipio = {
	idcidade: string;
	nome: string;
	idestado: string;
};

export type EnderecoPorCep = {
	cep: string;
	endereco: string | null;
	bairro: string | null;
	cidade: string | null;
	estado: string | null;
	idestado: string | null;
	idcidade: string | null;
};
