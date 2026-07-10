import { api } from "@/lib/axios";

export type ContabilidadeCadastro = {
	id: string;
	idempresa: string;
	nome: string;
	cnpj: string | null;
	emailprincipal: string;
	emailsadicionais: string[] | null;
	ativo: boolean;
	criadoem: string;
	atualizadoem: string;
};

export type SalvarContabilidadeData = {
	idempresa: string;
	nome: string;
	cnpj?: string | null;
	emailprincipal: string;
	emailsadicionais?: string[] | null;
	ativo?: boolean;
};

export const contabilidadeCadastroService = {
	async buscar(idempresa: string): Promise<ContabilidadeCadastro | null> {
		const { data } = await api.get<ContabilidadeCadastro | null>(
			"/contabilidade/cadastro",
			{ params: { idempresa } },
		);
		return data;
	},

	async salvar(dados: SalvarContabilidadeData): Promise<ContabilidadeCadastro> {
		const { data } = await api.put<ContabilidadeCadastro>(
			"/contabilidade/cadastro",
			dados,
		);
		return data;
	},
};
