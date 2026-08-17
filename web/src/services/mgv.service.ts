import { api } from "@/lib/axios";

export type ExportarProdutosMgvParams = {
	idempresa: string;
	departamentoPadrao: number;
	diasValidade: number;
	apenasPesaveis: boolean;
};

export type ExportarProdutosMgvResultado = {
	alertas: string[];
	totalLinhas: number;
};

export async function exportarProdutosMgv(
	params: ExportarProdutosMgvParams,
): Promise<ExportarProdutosMgvResultado> {
	const response = await api.post("/produtos/exportar-mgv", params, {
		responseType: "blob",
	});

	const contentDisposition = response.headers["content-disposition"];
	let filename = "TXTitens.txt";
	if (typeof contentDisposition === "string") {
		const filenameMatch = contentDisposition.match(/filename="(.+)"/);
		if (filenameMatch) filename = filenameMatch[1];
	}

	const alertasHeader = response.headers["x-mgv-alertas"];
	let alertas: string[] = [];
	if (typeof alertasHeader === "string") {
		try {
			alertas = JSON.parse(decodeURIComponent(alertasHeader)) as string[];
		} catch {
			alertas = [];
		}
	}

	const totalLinhasHeader = response.headers["x-mgv-total-linhas"];
	const totalLinhas =
		typeof totalLinhasHeader === "string"
			? Number.parseInt(totalLinhasHeader, 10)
			: 0;

	const blob = new Blob([response.data], {
		type: "text/plain;charset=iso-8859-1",
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
