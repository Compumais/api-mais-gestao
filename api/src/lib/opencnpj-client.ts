import type { OpenCnpjDados, OpenCnpjResposta } from "@/model/consulta-cnpj-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";

const OPENCNPJ_TIMEOUT_MS = 15_000;

function obterBaseUrlOpenCnpj(): string {
	const base = process.env.OPENCNPJ_BASE_URL ?? "https://kitana.opencnpj.com";
	return base.replace(/\/$/, "");
}

export class OpenCnpjNaoEncontradoError extends Error {
	constructor(cnpj: string) {
		super(`CNPJ ${cnpj} não encontrado`);
		this.name = "OpenCnpjNaoEncontradoError";
	}
}

export class OpenCnpjErroConsultaError extends Error {
	constructor(mensagem: string) {
		super(mensagem);
		this.name = "OpenCnpjErroConsultaError";
	}
}

export async function buscarCnpjOpenCnpj(cnpj: string): Promise<OpenCnpjDados> {
	const cnpjNormalizado = normalizarCnpj(cnpj);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), OPENCNPJ_TIMEOUT_MS);

	try {
		const resposta = await fetch(
			`${obterBaseUrlOpenCnpj()}/cnpj/${cnpjNormalizado}`,
			{
				headers: { Accept: "application/json" },
				signal: controller.signal,
			},
		);

		if (resposta.status === 404) {
			throw new OpenCnpjNaoEncontradoError(cnpjNormalizado);
		}

		if (!resposta.ok) {
			throw new OpenCnpjErroConsultaError(
				`OpenCNPJ retornou status ${resposta.status}`,
			);
		}

		const corpo = (await resposta.json()) as OpenCnpjResposta;

		if (!corpo.success || !corpo.data) {
			throw new OpenCnpjNaoEncontradoError(cnpjNormalizado);
		}

		return corpo.data;
	} catch (error) {
		if (error instanceof OpenCnpjNaoEncontradoError) {
			throw error;
		}

		if (error instanceof OpenCnpjErroConsultaError) {
			throw error;
		}

		if (error instanceof Error && error.name === "AbortError") {
			throw new OpenCnpjErroConsultaError("Timeout ao consultar OpenCNPJ");
		}

		throw new OpenCnpjErroConsultaError("Falha ao consultar OpenCNPJ");
	} finally {
		clearTimeout(timeout);
	}
}
