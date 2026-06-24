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
};

export const informativosService = {
	async listarPublicos() {
		const { data } = await api.get<{ informativos: Informativo[] }>(
			"/informativos",
		);
		return data;
	},
};
