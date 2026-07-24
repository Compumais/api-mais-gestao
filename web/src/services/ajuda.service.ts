import { api } from "@/lib/axios";

export interface AjudaPostPublico {
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

export const ajudaService = {
	async listarPublicos() {
		const { data } = await api.get<{ posts: AjudaPostPublico[] }>(
			"/ajuda-posts",
		);
		return data;
	},

	async buscarPorSlug(slug: string) {
		const { data } = await api.get<AjudaPostPublico>(`/ajuda-posts/${slug}`);
		return data;
	},
};
