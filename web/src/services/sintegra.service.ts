import { api } from "@/lib/axios";

export interface GerarSintegraParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	finalidade?: "1" | "2" | "3" | "5";
	incluirInventario?: boolean;
	dataInventario?: string;
}

export interface GerarSintegraResultado {
	alertas: string[];
	totalLinhas: number;
}

export async function gerarArquivoSintegra(
	params: GerarSintegraParams,
): Promise<GerarSintegraResultado> {
	const response = await api.post("/sintegra/gerar", params, {
		responseType: "blob",
	});

	const contentDisposition = response.headers["content-disposition"];
	let filename = "sintegra.txt";
	if (typeof contentDisposition === "string") {
		const filenameMatch = contentDisposition.match(/filename="(.+)"/);
		if (filenameMatch) filename = filenameMatch[1];
	}

	const alertasHeader = response.headers["x-sintegra-alertas"];
	let alertas: string[] = [];
	if (typeof alertasHeader === "string") {
		try {
			alertas = JSON.parse(decodeURIComponent(alertasHeader)) as string[];
		} catch {
			alertas = [];
		}
	}

	const totalLinhasHeader = response.headers["x-sintegra-total-linhas"];
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
