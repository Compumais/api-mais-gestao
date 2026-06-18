export type EstadoBrasil = {
	idestado: string;
	nome: string;
	codigoIbge: string;
};

export const ESTADOS_BRASIL: EstadoBrasil[] = [
	{ idestado: "AC", nome: "Acre", codigoIbge: "12" },
	{ idestado: "AL", nome: "Alagoas", codigoIbge: "27" },
	{ idestado: "AP", nome: "Amapá", codigoIbge: "16" },
	{ idestado: "AM", nome: "Amazonas", codigoIbge: "13" },
	{ idestado: "BA", nome: "Bahia", codigoIbge: "29" },
	{ idestado: "CE", nome: "Ceará", codigoIbge: "23" },
	{ idestado: "DF", nome: "Distrito Federal", codigoIbge: "53" },
	{ idestado: "ES", nome: "Espírito Santo", codigoIbge: "32" },
	{ idestado: "GO", nome: "Goiás", codigoIbge: "52" },
	{ idestado: "MA", nome: "Maranhão", codigoIbge: "21" },
	{ idestado: "MT", nome: "Mato Grosso", codigoIbge: "51" },
	{ idestado: "MS", nome: "Mato Grosso do Sul", codigoIbge: "50" },
	{ idestado: "MG", nome: "Minas Gerais", codigoIbge: "31" },
	{ idestado: "PA", nome: "Pará", codigoIbge: "15" },
	{ idestado: "PB", nome: "Paraíba", codigoIbge: "25" },
	{ idestado: "PR", nome: "Paraná", codigoIbge: "41" },
	{ idestado: "PE", nome: "Pernambuco", codigoIbge: "26" },
	{ idestado: "PI", nome: "Piauí", codigoIbge: "22" },
	{ idestado: "RJ", nome: "Rio de Janeiro", codigoIbge: "33" },
	{ idestado: "RN", nome: "Rio Grande do Norte", codigoIbge: "24" },
	{ idestado: "RS", nome: "Rio Grande do Sul", codigoIbge: "43" },
	{ idestado: "RO", nome: "Rondônia", codigoIbge: "11" },
	{ idestado: "RR", nome: "Roraima", codigoIbge: "14" },
	{ idestado: "SC", nome: "Santa Catarina", codigoIbge: "42" },
	{ idestado: "SP", nome: "São Paulo", codigoIbge: "35" },
	{ idestado: "SE", nome: "Sergipe", codigoIbge: "28" },
	{ idestado: "TO", nome: "Tocantins", codigoIbge: "17" },
];

export function buscarEstadoPorSigla(sigla: string): EstadoBrasil | undefined {
	return ESTADOS_BRASIL.find(
		(estado) => estado.idestado.toUpperCase() === sigla.toUpperCase(),
	);
}
