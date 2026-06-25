import { api } from "@/lib/axios";

export interface Entidade {
	id: string;
	idempresa: string;
	nome: string;
	razaosocial: string | null;
	tipopessoa: number | null;
	cnpjcpf: string;
	inscricaoestadual: string | null;
	rg: string | null;
	email: string | null;
	telefone: string | null;
	endereco: string | null;
	numeroendereco: string | null;
	complemento: string | null;
	bairro: string | null;
	idcidade: string | null;
	idestado: string | null;
	cep: string | null;
	fax: string | null;
	nascimento: string | null;
	idplanocontas: string | null;
	pais: string | null;
	cliente: number | null;
	fornecedor: number | null;
	transportador: number | null;
	representante: number | null;
	indiedest: number | null; // 1 = Contribuinte ICMS | 2 = Contribuinte Isento | 9 = Não Contribuinte
	criadoem: string;
	atualizadoem: string;
}

export interface ListarEntidadesResponse {
	data: Entidade[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarEntidadeData {
	idempresa: string;
	nome: string;
	cnpjcpf: string;
	razaosocial?: string | null;
	tipopessoa?: number | null;
	inscricaoestadual?: string | null;
	rg?: string | null;
	email?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	cep?: string | null;
	fax?: string | null;
	nascimento?: string | null;
	idplanocontas?: string | null;
	pais?: string | null;
	cliente?: number;
	fornecedor?: number;
	transportador?: number;
	representante?: number;
	indiedest?: number | null;
}

export interface ConsultaCnpjEntidadeResposta {
	entidade: {
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
	extras: {
		situacaoCadastral: string;
		dataSituacaoCadastral: string | null;
		dataInicioAtividades: string | null;
		naturezaJuridica: string | null;
		capitalSocial: number | null;
		opcaoSimples: string | null;
		opcaoMei: string | null;
		cnaes: Array<{ cnae: string; descricao: string }>;
		socios: Array<{
			nomeSocio: string;
			descricao: string;
			dataEntradaSociedade: string | null;
		}>;
	};
	jaCadastrada: { id: string } | null;
}

export interface AtualizarEntidadeData {
	nome?: string;
	cnpjcpf?: string;
	razaosocial?: string | null;
	tipopessoa?: number | null;
	inscricaoestadual?: string | null;
	rg?: string | null;
	email?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	cep?: string | null;
	fax?: string | null;
	nascimento?: string | null;
	idplanocontas?: string | null;
	pais?: string | null;
	cliente?: number;
	fornecedor?: number;
	transportador?: number;
	representante?: number;
	indiedest?: number | null;
}

export const entidadesService = {
	async listar(params?: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		fornecedor?: number;
		cliente?: number;
		transportador?: number;
		representante?: number;
		q?: string;
		email?: string;
		telefone?: string;
	}): Promise<ListarEntidadesResponse> {
		const { data } = await api.get<ListarEntidadesResponse>("/entidades", {
			params,
		});
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		nome?: string;
		q?: string;
	}): Promise<Entidade[]> {
		const limite = 100;
		let pagina = 1;
		const registros: Entidade[] = [];

		while (true) {
			const resposta = await entidadesService.listar({
				...params,
				page: pagina,
				limit: limite,
			});

			registros.push(...resposta.data);

			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}

			pagina += 1;
		}

		return registros;
	},

	async buscar(id: string): Promise<Entidade> {
		const { data } = await api.get<Entidade>(`/entidades/${id}`);
		return data;
	},

	async consultarCnpj(
		cnpj: string,
		idempresa?: string,
	): Promise<ConsultaCnpjEntidadeResposta> {
		const cnpjLimpo = cnpj.replace(/\D/g, "");
		const { data } = await api.get<ConsultaCnpjEntidadeResposta>(
			`/entidades/cnpj/${cnpjLimpo}`,
			{
				params: idempresa ? { idempresa } : undefined,
			},
		);
		return data;
	},

	async criar(dados: CriarEntidadeData): Promise<Entidade> {
		const { data } = await api.post<Entidade>("/entidades", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarEntidadeData): Promise<Entidade> {
		const { data } = await api.put<Entidade>(`/entidades/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/entidades/${id}`);
	},
};
