import type { OpenCnpjDados } from "@/model/consulta-cnpj-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import {
	mapearOpenCnpjOrgParaOpenCnpjDados,
	type OpenCnpjOrgResposta,
} from "@/util/mapear-opencnpj-org-cnpj.js";

const OPENCNPJ_TIMEOUT_MS = 15_000;
const OPENCNPJ_USER_AGENT = "MaisGestao/1.0 (+https://maisgestao.com.br)";

function obterBaseUrlOpenCnpj(): string {
	const base = process.env.OPENCNPJ_BASE_URL ?? "https://api.opencnpj.org";
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
			`${obterBaseUrlOpenCnpj()}/${cnpjNormalizado}`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": OPENCNPJ_USER_AGENT,
				},
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

		const corpo = (await resposta.json()) as OpenCnpjOrgResposta;

		if (corpo.error || !corpo.cnpj) {
			throw new OpenCnpjNaoEncontradoError(cnpjNormalizado);
		}

		return mapearOpenCnpjOrgParaOpenCnpjDados(corpo);
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
