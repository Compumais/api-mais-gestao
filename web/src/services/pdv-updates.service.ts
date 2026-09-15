import { api } from "@/lib/axios";

export type ManifestoUpdatePdv = {
	version: string;
	artifact: string;
	url: string;
	releasedAt?: string;
};

function baseUrlApi(): string {
	return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
}

export function urlDownloadPdv(manifesto: ManifestoUpdatePdv): string {
	if (/^https?:\/\//i.test(manifesto.url)) {
		return manifesto.url;
	}
	const caminho = manifesto.url.startsWith("/")
		? manifesto.url
		: `/pdv/updates/${manifesto.artifact}`;
	return `${baseUrlApi()}${caminho}`;
}

export const pdvUpdatesService = {
	async obterManifesto(): Promise<ManifestoUpdatePdv> {
		const { data } = await api.get<ManifestoUpdatePdv>(
			"/pdv/updates/version.json",
		);
		return data;
	},
};
