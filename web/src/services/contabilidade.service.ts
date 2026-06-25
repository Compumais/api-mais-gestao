import { api } from "@/lib/axios";

export interface ExportarXmlsFiscaisParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}

async function downloadBlob(
	url: string,
	params: ExportarXmlsFiscaisParams,
	defaultFilename: string,
): Promise<void> {
	const response = await api.post(url, params, { responseType: "blob" });
	const contentDisposition = response.headers["content-disposition"];
	let filename = defaultFilename;
	if (typeof contentDisposition === "string") {
		const filenameMatch = contentDisposition.match(/filename="(.+)"/);
		if (filenameMatch) filename = filenameMatch[1];
	}
	const rawContentType = response.headers["content-type"];
	const contentType =
		typeof rawContentType === "string"
			? rawContentType
			: "application/zip";
	const blob = new Blob([response.data], { type: contentType });
	const blobUrl = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(blobUrl);
}

export async function exportarXmlsFiscais(
	params: ExportarXmlsFiscaisParams,
): Promise<void> {
	try {
		await downloadBlob(
			"/contabilidade/exportar-xmls",
			params,
			`xmls-fiscais-${params.dataInicio}-${params.dataFim}.zip`,
		);
	} catch (error: unknown) {
		if (error && typeof error === "object" && "response" in error) {
			const axiosError = error as {
				response?: { data?: Blob };
			};
			const data = axiosError.response?.data;
			if (data instanceof Blob) {
				const texto = await data.text();
				try {
					const erro = JSON.parse(texto) as { error?: string };
					throw new Error(erro.error || "Erro ao exportar XMLs fiscais");
				} catch {
					throw new Error("Erro ao exportar XMLs fiscais");
				}
			}
		}
		throw new Error("Erro ao exportar XMLs fiscais");
	}
}
