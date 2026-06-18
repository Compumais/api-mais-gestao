import { api } from "@/lib/axios";

export interface Estado {
	idestado: string;
	nome: string;
	codigoIbge: string;
}

export interface Municipio {
	idcidade: string;
	nome: string;
	idestado: string;
}

export interface EnderecoPorCep {
	cep: string;
	endereco: string | null;
	bairro: string | null;
	cidade: string | null;
	estado: string | null;
	idestado: string | null;
	idcidade: string | null;
}

export const localidadesService = {
	async listarEstados(): Promise<{ data: Estado[] }> {
		const { data } = await api.get<{ data: Estado[] }>("/localidades/estados");
		return data;
	},

	async listarMunicipios(
		uf: string,
		nome?: string,
	): Promise<{ data: Municipio[] }> {
		const { data } = await api.get<{ data: Municipio[] }>(
			`/localidades/estados/${uf}/municipios`,
			{ params: nome ? { nome } : undefined },
		);
		return data;
	},

	async buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep> {
		const cepLimpo = cep.replace(/\D/g, "");
		const { data } = await api.get<EnderecoPorCep>(
			`/localidades/cep/${cepLimpo}`,
		);
		return data;
	},
};
