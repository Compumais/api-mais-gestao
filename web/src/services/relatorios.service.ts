import { api } from "@/lib/axios";

export interface GerarRelatorioFluxoCaixaParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export interface GerarRelatorioContasParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: "pdf" | "txt" | "html";
}

async function downloadRelatorioBlob(
	url: string,
	params: { dataInicio: string; dataFim: string; formato: string },
	defaultFilename: string,
): Promise<void> {
	const response = await api.post(url, params, { responseType: "blob" });
	const contentDisposition = response.headers["content-disposition"];
	let filename = defaultFilename;
	if (contentDisposition) {
		const filenameMatch = contentDisposition.match(/filename="(.+)"/);
		if (filenameMatch) filename = filenameMatch[1];
	}
	const blob = new Blob([response.data], {
		type: response.headers["content-type"] || "application/octet-stream",
	});
	const blobUrl = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(blobUrl);
}

export async function gerarRelatorioFluxoCaixa(
	params: GerarRelatorioFluxoCaixaParams,
): Promise<void> {
	try {
		await downloadRelatorioBlob(
			"/relatorios/fluxo-caixa",
			params,
			`fluxo-caixa-${params.dataInicio}-${params.dataFim}.${params.formato}`,
		);
	} catch (error: unknown) {
		console.error("Erro ao gerar relatório:", error);
		const msg =
			error && typeof error === "object" && "response" in error
				? (error as { response?: { data?: { error?: string } } }).response?.data?.error
				: undefined;
		throw new Error(msg || "Erro ao gerar relatório de fluxo de caixa");
	}
}

export async function gerarRelatorioContasPagar(
	params: GerarRelatorioContasParams,
): Promise<void> {
	try {
		await downloadRelatorioBlob(
			"/relatorios/contas-pagar",
			params,
			`contas-a-pagar-${params.dataInicio}-${params.dataFim}.${params.formato === "pdf" ? "html" : params.formato}`,
		);
	} catch (error: unknown) {
		console.error("Erro ao gerar relatório contas a pagar:", error);
		const msg =
			error && typeof error === "object" && "response" in error
				? (error as { response?: { data?: { error?: string } } }).response?.data?.error
				: undefined;
		throw new Error(msg || "Erro ao gerar relatório de contas a pagar");
	}
}

export async function gerarRelatorioContasReceber(
	params: GerarRelatorioContasParams,
): Promise<void> {
	try {
		await downloadRelatorioBlob(
			"/relatorios/contas-receber",
			params,
			`contas-a-receber-${params.dataInicio}-${params.dataFim}.${params.formato === "pdf" ? "html" : params.formato}`,
		);
	} catch (error: unknown) {
		console.error("Erro ao gerar relatório contas a receber:", error);
		const msg =
			error && typeof error === "object" && "response" in error
				? (error as { response?: { data?: { error?: string } } }).response?.data?.error
				: undefined;
		throw new Error(msg || "Erro ao gerar relatório de contas a receber");
	}
}

