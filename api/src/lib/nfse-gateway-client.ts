import type {
	NfseGatewayCancelamentoResposta,
	NfseGatewayConsultaResposta,
	NfseGatewayEmissaoResposta,
	NfseGatewayRespostaBase,
	PayloadNfse,
} from "@/model/nfse-emissao-model.js";

type PayloadGatewayNfse = {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	payloadNfse?: PayloadNfse;
};

function obterConfigGateway() {
	const url = (process.env.NFSE_GATEWAY_URL ?? "http://127.0.0.1:8089").replace(
		/\/$/,
		"",
	);
	const secret = (process.env.NFSE_GATEWAY_SECRET ?? "").trim();

	if (!secret) {
		throw new Error(
			"NFSE_GATEWAY_SECRET não configurado na API. Defina o mesmo valor em api/.env e api_Nfe/nfse-gateway/.env.",
		);
	}

	return { url, secret };
}

function obterMensagemErroBruta(erro: unknown): string {
	if (erro instanceof Error) {
		const causa = erro.cause;
		if (causa instanceof Error && causa.message) {
			return `${erro.message}: ${causa.message}`;
		}
		return erro.message;
	}
	return "Falha ao comunicar com nfse-gateway";
}

export function formatarErroConexaoGatewayNfse(
	url: string,
	erro: unknown,
): string {
	const mensagemBruta = obterMensagemErroBruta(erro).toLowerCase();

	if (
		mensagemBruta.includes("fetch failed") ||
		mensagemBruta.includes("econnrefused") ||
		mensagemBruta.includes("enotfound") ||
		mensagemBruta.includes("econnreset") ||
		mensagemBruta.includes("network")
	) {
		return `Não foi possível conectar ao gateway NFS-e em ${url}. Verifique se o nfse-gateway está em execução.`;
	}

	if (mensagemBruta.includes("abort")) {
		return "Tempo esgotado ao aguardar resposta do gateway NFS-e.";
	}

	return obterMensagemErroBruta(erro);
}

function extrairJsonRespostaGateway(texto: string): unknown {
	const conteudo = texto.trim();
	if (!conteudo) {
		throw new Error("Gateway NFS-e retornou resposta vazia");
	}

	try {
		return JSON.parse(conteudo) as unknown;
	} catch {
		const inicioJson = conteudo.indexOf("{");
		const fimJson = conteudo.lastIndexOf("}");
		if (inicioJson >= 0 && fimJson > inicioJson) {
			return JSON.parse(conteudo.slice(inicioJson, fimJson + 1)) as unknown;
		}

		throw new Error(
			`Gateway NFS-e retornou resposta inválida (não é JSON): ${conteudo.slice(0, 200)}`,
		);
	}
}

async function lerCorpoRespostaGateway(resposta: Response): Promise<unknown> {
	const texto = await resposta.text();
	return extrairJsonRespostaGateway(texto);
}

async function chamarNfseGateway<T extends NfseGatewayRespostaBase>(
	caminho: string,
	payload: PayloadGatewayNfse | Record<string, unknown>,
): Promise<T> {
	let url: string;
	let secret: string;

	try {
		({ url, secret } = obterConfigGateway());
	} catch (erro) {
		return {
			sucesso: false,
			erro: obterMensagemErroBruta(erro),
		} as T;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 60_000);

	try {
		const resposta = await fetch(`${url}${caminho}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nfse-Gateway-Secret": secret,
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		const corpo = (await lerCorpoRespostaGateway(resposta)) as T;

		if (!resposta.ok && corpo.sucesso !== true) {
			const erroGateway = corpo.erro ?? `Gateway retornou HTTP ${resposta.status}`;
			const erro =
				resposta.status === 401
					? "Falha de autenticação com o gateway NFS-e. Verifique se NFSE_GATEWAY_SECRET é o mesmo na API e no container Docker (api_Nfe/nfse-gateway/.env)."
					: resposta.status === 404 &&
							(erroGateway.includes("Rota não encontrada") ||
								erroGateway.toLowerCase().includes("not found"))
						? `Rota ${caminho} não disponível no nfse-gateway em execução. Reconstrua o container: cd api_Nfe/nfse-gateway && docker compose up -d --build`
						: erroGateway;

			return {
				sucesso: false,
				erro,
			} as T;
		}

		return corpo;
	} catch (erro) {
		return {
			sucesso: false,
			erro: formatarErroConexaoGatewayNfse(url, erro),
		} as T;
	} finally {
		clearTimeout(timeout);
	}
}

export async function emitirNfseGateway(
	payload: PayloadGatewayNfse,
): Promise<NfseGatewayEmissaoResposta> {
	return chamarNfseGateway<NfseGatewayEmissaoResposta>(
		"/nfse/emissao",
		payload,
	);
}

export async function cancelarNfseGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	dados: Record<string, unknown>;
}): Promise<NfseGatewayCancelamentoResposta> {
	return chamarNfseGateway<NfseGatewayCancelamentoResposta>(
		"/nfse/cancelar",
		payload,
	);
}

export async function consultarNfsePorRpsGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	dados: Record<string, unknown>;
}): Promise<NfseGatewayConsultaResposta> {
	return chamarNfseGateway<NfseGatewayConsultaResposta>(
		"/nfse/consultar-rps",
		payload,
	);
}

export async function verificarSaudeNfseGateway(): Promise<boolean> {
	const { url } = obterConfigGateway();

	try {
		const resposta = await fetch(`${url}/health`);
		return resposta.ok;
	} catch {
		return false;
	}
}
