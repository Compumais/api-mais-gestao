import { api } from "@/lib/axios";

export interface GerarEfdParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	finalidade?: "0" | "1";
	incluirInventario?: boolean;
	dataInventario?: string;
}

export interface GerarEfdResultado {
	alertas: string[];
	totalLinhas: number;
}

async function baixarArquivoEfd(
	url: string,
	params: GerarEfdParams,
	filenamePadrao: string,
): Promise<GerarEfdResultado> {
	const response = await api.post(url, params, {
		responseType: "blob",
	});

	const contentDisposition = response.headers["content-disposition"];
	let filename = filenamePadrao;
	if (typeof contentDisposition === "string") {
		const filenameMatch = contentDisposition.match(/filename="(.+)"/);
		if (filenameMatch) filename = filenameMatch[1];
	}

	const alertasHeader = response.headers["x-efd-alertas"];
	let alertas: string[] = [];
	if (typeof alertasHeader === "string") {
		try {
			alertas = JSON.parse(decodeURIComponent(alertasHeader)) as string[];
		} catch {
			alertas = [];
		}
	}

	const totalLinhasHeader = response.headers["x-efd-total-linhas"];
	const totalLinhas =
		typeof totalLinhasHeader === "string"
			? Number.parseInt(totalLinhasHeader, 10)
			: 0;

	const blob = new Blob([response.data], {
		type: "text/plain;charset=utf-8",
	});
	const blobUrl = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(blobUrl);

	return { alertas, totalLinhas };
}

export async function gerarArquivoEfdIcms(
	params: GerarEfdParams,
): Promise<GerarEfdResultado> {
	return baixarArquivoEfd("/efd-icms/gerar", params, "efd-icms.txt");
}

export async function gerarArquivoEfdContribuicoes(
	params: GerarEfdParams,
): Promise<GerarEfdResultado> {
	return baixarArquivoEfd(
		"/efd-contribuicoes/gerar",
		params,
		"efd-contribuicoes.txt",
	);
}

export type TipoAjusteEfd = "icms" | "pis" | "cofins";
export type NaturezaAjusteEfd = "debito" | "credito";

export type AjusteApuracaoEfd = {
	id: string;
	idempresa: string;
	tipo: TipoAjusteEfd;
	competencia: string;
	codigoajuste: string;
	descricao: string | null;
	valor: string;
	natureza: NaturezaAjusteEfd;
	criadoem: string;
	atualizadoem: string;
};

export async function listarAjustesApuracaoEfd(params: {
	idempresa: string;
	competencia?: string;
}): Promise<AjusteApuracaoEfd[]> {
	const { data } = await api.get<AjusteApuracaoEfd[]>("/efd/ajustes", {
		params,
	});
	return data;
}

export async function criarAjusteApuracaoEfd(params: {
	idempresa: string;
	tipo: TipoAjusteEfd;
	competencia: string;
	codigoajuste: string;
	descricao?: string | null;
	valor: string;
	natureza: NaturezaAjusteEfd;
}): Promise<AjusteApuracaoEfd> {
	const { data } = await api.post<AjusteApuracaoEfd>("/efd/ajustes", params);
	return data;
}

export async function excluirAjusteApuracaoEfd(params: {
	id: string;
	idempresa: string;
}): Promise<void> {
	await api.delete(`/efd/ajustes/${params.id}`, {
		params: { idempresa: params.idempresa },
	});
}

export function periodoMesCivil(anoMes: string): {
	dataInicio: string;
	dataFim: string;
} {
	const [anoTexto, mesTexto] = anoMes.split("-");
	const ano = Number.parseInt(anoTexto ?? "", 10);
	const mes = Number.parseInt(mesTexto ?? "", 10);
	if (!ano || !mes) {
		const hoje = new Date();
		return periodoMesCivil(
			`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
		);
	}
	const ultimoDia = new Date(ano, mes, 0).getDate();
	return {
		dataInicio: `${anoTexto}-${mesTexto}-01`,
		dataFim: `${anoTexto}-${mesTexto}-${String(ultimoDia).padStart(2, "0")}`,
	};
}

export function mesAtualAnoMes(): string {
	const hoje = new Date();
	return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}
