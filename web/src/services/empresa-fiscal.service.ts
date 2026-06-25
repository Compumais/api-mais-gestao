import { api } from "@/lib/axios";
import type { RegimeTributarioEmpresa } from "@/services/empresas.service";

export interface EmpresaFiscal {
	id: string;
	idempresa: string;
	razaosocial?: string | null;
	nomefantasia?: string | null;
	inscricaoestadual?: string | null;
	inscricaomunicipal?: string | null;
	crt?: number | null;
	cnae?: string | null;
	indicadorie?: number | null;
	logradouro?: string | null;
	numero?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	cep?: string | null;
	codigomunicipioibge?: string | null;
	uf?: string | null;
	codigopais?: string | null;
	telefone?: string | null;
	email?: string | null;
	regimetributario?: RegimeTributarioEmpresa | null;
}

export const empresaFiscalService = {
	async buscar(idempresa: string): Promise<EmpresaFiscal> {
		const { data } = await api.get<EmpresaFiscal>(
			`/empresas/${idempresa}/fiscal`,
		);
		return data;
	},

	async atualizar(
		idempresa: string,
		dados: Partial<EmpresaFiscal>,
	): Promise<EmpresaFiscal> {
		const { data } = await api.put<EmpresaFiscal>(
			`/empresas/${idempresa}/fiscal`,
			dados,
		);
		return data;
	},
};
