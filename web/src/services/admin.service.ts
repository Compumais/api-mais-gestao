import { api } from "@/lib/axios";

export interface AdminDashboardData {
	totalUsuarios: number;
	totalEmpresas: number;
	totalPagamentos: number;
	faturamentoMesAtual: number;
	faturamentoMensal: Array<{ mes: number; label: string; valor: number }>;
	topAssinantes: Array<{
		id: string;
		nome: string;
		email: string;
		plano: string | null;
		desde: string;
	}>;
	topEmpresas: Array<{
		id: string;
		nome: string;
		totalRegistros: number;
	}>;
}

export interface AdminUsuario {
	id: string;
	nome: string;
	email: string;
	perfil: string[];
	ativo: boolean;
	plano: string | null;
	criadoem: string;
}

export interface AdminFeatureSaas {
	id: string;
	codigo: string;
	nome: string;
}

export interface AdminPlanoSaas {
	id: string;
	codigo: string;
	nome: string;
	descricao: string | null;
	valormensal: string;
	maxempresas: number;
	maxusuarios: number;
	ordem: number;
	ativo: boolean;
	features: AdminFeatureSaas[];
}

export interface AdminModuloSaas {
	id: string;
	codigo: string;
	nome: string;
	descricao: string | null;
	valormensal: string;
	ativo: boolean;
}

export interface AdminEntitlement {
	plano: string | null;
	modulos: string[];
	features: string[];
}

export interface AdminEmpresa {
	id: string;
	nome: string;
	cnpj: string;
	telefone: string;
	email: string;
	idproprietario: string;
	criadoem: string;
}

export interface Informativo {
	id: string;
	titulo: string;
	conteudo: string;
	publicado: boolean;
	publicadoem: string;
	criadoem: string;
}

export interface AjudaPostAdmin {
	id: string;
	titulo: string;
	subtitulo: string | null;
	descricao: string;
	capa: string | null;
	imagens: string[];
	slug: string;
	publicado: boolean;
	autorid: string;
	editorid: string;
	criadoem: string;
	atualizadoem: string;
	autorNome: string | null;
	editorNome: string | null;
}

export type AjudaPostPayload = {
	titulo: string;
	subtitulo?: string | null;
	descricao: string;
	capa?: string | null;
	imagens?: string[];
	publicado?: boolean;
};

export const adminService = {
	async buscarDashboard(): Promise<AdminDashboardData> {
		const { data } = await api.get<AdminDashboardData>("/admin/dashboard");
		return data;
	},

	async listarUsuarios(params?: {
		nome?: string;
		email?: string;
		ativo?: boolean;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{ usuarios: AdminUsuario[]; total: number }>(
			"/admin/usuarios",
			{ params },
		);
		return data;
	},

	async criarUsuario(body: {
		nome: string;
		email: string;
		password: string;
		perfil: string;
		empresasIds?: string[];
		plano?: string | null;
	}) {
		const { data } = await api.post<AdminUsuario>("/admin/usuarios", body);
		return data;
	},

	async atualizarUsuario(
		id: string,
		body: Partial<{ nome: string; email: string; perfil: string }>,
	) {
		const { data } = await api.patch<AdminUsuario>(
			`/admin/usuarios/${id}`,
			body,
		);
		return data;
	},

	async alterarSenha(id: string, novaSenha: string) {
		const { data } = await api.patch(`/admin/usuarios/${id}/senha`, {
			novaSenha,
		});
		return data;
	},

	async inativarUsuario(id: string) {
		const { data } = await api.patch<AdminUsuario>(
			`/admin/usuarios/${id}/inativar`,
		);
		return data;
	},

	async ativarUsuario(id: string) {
		const { data } = await api.patch<AdminUsuario>(
			`/admin/usuarios/${id}/ativar`,
		);
		return data;
	},

	async listarPlanosSaas() {
		const { data } = await api.get<{
			planos: AdminPlanoSaas[];
			features: AdminFeatureSaas[];
			modulos: AdminModuloSaas[];
		}>("/admin/planos-saas");
		return data;
	},

	async atualizarPlanoSaas(
		id: string,
		body: Partial<{
			nome: string;
			descricao: string | null;
			valormensal: string;
			maxempresas: number;
			maxusuarios: number;
			ativo: boolean;
			idfeatures: string[];
		}>,
	) {
		const { data } = await api.patch<AdminPlanoSaas>(
			`/admin/planos-saas/${id}`,
			body,
		);
		return data;
	},

	async criarPlanoSaas(body: {
		codigo: string;
		nome: string;
		descricao?: string | null;
		valormensal: string;
		maxempresas: number;
		maxusuarios: number;
		ordem: number;
		ativo?: boolean;
		idfeatures?: string[];
	}) {
		const { data } = await api.post<AdminPlanoSaas>("/admin/planos-saas", body);
		return data;
	},

	async atualizarModuloSaas(
		id: string,
		body: Partial<{ valormensal: string; ativo: boolean }>,
	) {
		const { data } = await api.patch<AdminModuloSaas>(
			`/admin/modulos-saas/${id}`,
			body,
		);
		return data;
	},

	async criarModuloSaas(body: {
		codigo: string;
		nome: string;
		descricao?: string | null;
		valormensal: string;
		ativo?: boolean;
	}) {
		const { data } = await api.post<AdminModuloSaas>(
			"/admin/modulos-saas",
			body,
		);
		return data;
	},

	async buscarEntitlementUsuario(id: string) {
		const { data } = await api.get<AdminEntitlement>(
			`/admin/usuarios/${id}/entitlement`,
		);
		return data;
	},

	async atualizarEntitlementUsuario(
		id: string,
		body: {
			plano?: string | null;
			modulos?: Array<{ codigo: string; ativo: boolean }>;
		},
	) {
		const { data } = await api.put<AdminEntitlement>(
			`/admin/usuarios/${id}/entitlement`,
			body,
		);
		return data;
	},

	async associarEmpresa(
		idusuario: string,
		body: { idempresa: string; perfilNaEmpresa?: string },
	) {
		const { data } = await api.post(
			`/admin/usuarios/${idusuario}/associar-empresa`,
			body,
		);
		return data;
	},

	async listarEmpresas() {
		const { data } = await api.get<{ empresas: AdminEmpresa[] }>(
			"/admin/empresas",
		);
		return data;
	},

	async criarEmpresa(body: {
		nome: string;
		cnpj: string;
		telefone: string;
		email?: string;
		endereco?: string;
		numero?: string;
		complemento?: string;
		bairro?: string;
		cep?: string;
		idestado?: string;
		idcidade?: string;
		idproprietario?: string;
		idusuarioAssociado?: string;
		perfilAssociado?: string;
	}) {
		const { data } = await api.post<AdminEmpresa>("/admin/empresas", body);
		return data;
	},

	async listarInformativos() {
		const { data } = await api.get<{ informativos: Informativo[] }>(
			"/admin/informativos",
		);
		return data;
	},

	async criarInformativo(body: {
		titulo: string;
		conteudo: string;
		publicado?: boolean;
	}) {
		const { data } = await api.post<Informativo>("/admin/informativos", body);
		return data;
	},

	async atualizarInformativo(
		id: string,
		body: Partial<{ titulo: string; conteudo: string; publicado: boolean }>,
	) {
		const { data } = await api.patch<Informativo>(
			`/admin/informativos/${id}`,
			body,
		);
		return data;
	},

	async excluirInformativo(id: string) {
		const { data } = await api.delete(`/admin/informativos/${id}`);
		return data;
	},

	async listarAjudaPosts() {
		const { data } = await api.get<{ posts: AjudaPostAdmin[] }>(
			"/admin/ajuda-posts",
		);
		return data;
	},

	async criarAjudaPost(body: AjudaPostPayload) {
		const { data } = await api.post<AjudaPostAdmin>("/admin/ajuda-posts", body);
		return data;
	},

	async atualizarAjudaPost(id: string, body: Partial<AjudaPostPayload>) {
		const { data } = await api.patch<AjudaPostAdmin>(
			`/admin/ajuda-posts/${id}`,
			body,
		);
		return data;
	},

	async excluirAjudaPost(id: string) {
		const { data } = await api.delete(`/admin/ajuda-posts/${id}`);
		return data;
	},
};

export const informativosService = {
	async listarPublicos() {
		const { data } = await api.get<{ informativos: Informativo[] }>(
			"/informativos",
		);
		return data;
	},
};
