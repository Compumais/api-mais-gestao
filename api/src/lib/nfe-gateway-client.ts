export type NfeGatewayRespostaBase = {
	sucesso: boolean;
	erro?: string;
};

export type NfeGatewayStatusResposta = NfeGatewayRespostaBase & {
	xml?: string;
	cStat?: string;
	xMotivo?: string;
};

export type NfeGatewayEmissaoResposta = NfeGatewayRespostaBase & {
	xmlEnviado?: string;
	xmlRetorno?: string;
	chave?: string;
	cStat?: string;
	cStatLote?: string;
	xMotivo?: string;
	protocolo?: string;
};

export type NfeGatewayEventoResposta = NfeGatewayRespostaBase & {
	cStat?: string;
	cStatLote?: string;
	xMotivo?: string;
	protocolo?: string;
	xmlRetorno?: string;
	xmlProtocolado?: string;
};

export type NfeGatewayCertificadoInfoResposta = NfeGatewayRespostaBase & {
	cnpj?: string;
	validadeInicio?: string;
	validadeFim?: string;
	serial?: string;
};

export type NfeGatewayDanfeResposta = NfeGatewayRespostaBase & {
	pdfBase64?: string;
};

export type NfeGatewayDocZipItem = {
	nsu: string;
	schema: string;
	content: string;
};

export type NfeGatewayDistDfeResposta = NfeGatewayRespostaBase & {
	cStat?: string;
	xMotivo?: string;
	ultNSU?: string;
	maxNSU?: string;
	docZip?: NfeGatewayDocZipItem[];
	xml?: string;
};

export type NfeGatewayManifestacaoResposta = NfeGatewayRespostaBase & {
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
	xmlRetorno?: string;
	tpEvento?: string;
};

export type NfeGatewayConsultaChaveResposta = NfeGatewayRespostaBase & {
	cStat?: string;
	xMotivo?: string;
	chNFe?: string;
	protNFe?: unknown;
	xml?: string;
};

type PayloadGateway = {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	payloadNfe?: Record<string, unknown>;
};

function obterConfigGateway() {
	const url = process.env.NFE_GATEWAY_URL ?? "http://127.0.0.1:8088";
	const secret = process.env.NFE_GATEWAY_SECRET ?? "";

	return { url: url.replace(/\/$/, ""), secret };
}

function obterMensagemErroBruta(erro: unknown): string {
	if (erro instanceof Error) {
		const causa = erro.cause;
		if (causa instanceof Error && causa.message) {
			return `${erro.message}: ${causa.message}`;
		}
		return erro.message;
	}
	return "Falha ao comunicar com nfe-gateway";
}

export function formatarErroConexaoGateway(url: string, erro: unknown): string {
	const mensagemBruta = obterMensagemErroBruta(erro).toLowerCase();

	if (
		mensagemBruta.includes("fetch failed") ||
		mensagemBruta.includes("econnrefused") ||
		mensagemBruta.includes("enotfound") ||
		mensagemBruta.includes("econnreset") ||
		mensagemBruta.includes("network")
	) {
		return `Não foi possível conectar ao gateway NF-e em ${url}. Verifique se o nfe-gateway está em execução.`;
	}

	if (mensagemBruta.includes("abort")) {
		return "Tempo esgotado ao aguardar resposta do gateway NF-e.";
	}

	return obterMensagemErroBruta(erro);
}

function extrairJsonRespostaGateway(texto: string): unknown {
	const conteudo = texto.trim();
	if (!conteudo) {
		throw new Error("Gateway NF-e retornou resposta vazia");
	}

	try {
		return JSON.parse(conteudo) as unknown;
	} catch {
		const inicioJson = conteudo.indexOf("{");
		const fimJson = conteudo.lastIndexOf("}");
		if (inicioJson >= 0 && fimJson > inicioJson) {
			return JSON.parse(conteudo.slice(inicioJson, fimJson + 1)) as unknown;
		}

		if (conteudo.includes("<br") || conteudo.includes("<b>")) {
			const textoLimpo = conteudo
				.replace(/<br\s*\/?>/gi, "\n")
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			throw new Error(
				textoLimpo ||
					"Gateway NF-e retornou erro PHP em HTML. Reconstrua o container: cd api_Nfe/nfe-gateway && docker compose up -d --build",
			);
		}

		throw new Error(
			`Gateway NF-e retornou resposta inválida (não é JSON): ${conteudo.slice(0, 200)}`,
		);
	}
}

async function lerCorpoRespostaGateway(resposta: Response): Promise<unknown> {
	const texto = await resposta.text();
	return extrairJsonRespostaGateway(texto);
}

async function chamarNfeGateway<T extends NfeGatewayRespostaBase>(
	caminho: string,
	payload:
		| PayloadGateway
		| { pfxBase64: string; senha: string }
		| { xml: string }
		| Record<string, unknown>,
): Promise<T> {
	const { url, secret } = obterConfigGateway();

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 60_000);

	try {
		const resposta = await fetch(`${url}${caminho}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nfe-Gateway-Secret": secret,
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		const corpo = (await lerCorpoRespostaGateway(resposta)) as T;

		if (!resposta.ok && corpo.sucesso !== true) {
			const erroGateway = corpo.erro ?? `Gateway retornou HTTP ${resposta.status}`;
			const erro =
				resposta.status === 401
					? "Falha de autenticação com o gateway NF-e. Verifique se NFE_GATEWAY_SECRET é o mesmo na API e no container Docker (api_Nfe/nfe-gateway/.env)."
					: resposta.status === 404 &&
							(erroGateway.includes("Rota não encontrada") ||
								erroGateway.toLowerCase().includes("not found"))
						? `Rota ${caminho} não disponível no nfe-gateway em execução. Reconstrua o container: cd api_Nfe/nfe-gateway && docker compose up -d --build`
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
			erro: formatarErroConexaoGateway(url, erro),
		} as T;
	} finally {
		clearTimeout(timeout);
	}
}

export async function consultarStatusSefazGateway(
	payload: PayloadGateway,
): Promise<NfeGatewayStatusResposta> {
	return chamarNfeGateway<NfeGatewayStatusResposta>("/sefaz/status", payload);
}

export async function emitirNfeHomologacaoGateway(
	payload: PayloadGateway,
): Promise<NfeGatewayEmissaoResposta> {
	return chamarNfeGateway<NfeGatewayEmissaoResposta>(
		"/nfe/homologacao/emitir",
		payload,
	);
}

export async function obterInfoCertificadoGateway(payload: {
	pfxBase64: string;
	senha: string;
}): Promise<NfeGatewayCertificadoInfoResposta> {
	return chamarNfeGateway<NfeGatewayCertificadoInfoResposta>(
		"/certificado/info",
		payload,
	);
}

export async function emitirNfeGateway(
	payload: PayloadGateway,
): Promise<NfeGatewayEmissaoResposta> {
	return chamarNfeGateway<NfeGatewayEmissaoResposta>("/nfe/emissao", payload);
}

export async function cancelarNfeGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	dados: {
		chave: string;
		protocolo: string;
		justificativa: string;
	};
}): Promise<NfeGatewayEventoResposta> {
	return chamarNfeGateway<NfeGatewayEventoResposta>("/nfe/cancelar", payload);
}

export async function inutilizarNfeGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	dados: {
		serie: number;
		numeroInicial: number;
		numeroFinal?: number;
		justificativa: string;
	};
}): Promise<NfeGatewayEventoResposta> {
	return chamarNfeGateway<NfeGatewayEventoResposta>("/nfe/inutilizar", payload);
}

export async function gerarDanfeGateway(
	xml: string,
): Promise<NfeGatewayDanfeResposta> {
	return chamarNfeGateway<NfeGatewayDanfeResposta>("/nfe/danfe", { xml });
}

export async function consultarDistribuicaoDfeGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	ultNSU: string;
	cUFAutor?: number;
}): Promise<NfeGatewayDistDfeResposta> {
	return chamarNfeGateway<NfeGatewayDistDfeResposta>("/sefaz/dist-dfe", payload);
}

export async function consultarDistribuicaoDfePorChaveGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	chaveNfe: string;
	cUFAutor?: number;
}): Promise<NfeGatewayDistDfeResposta> {
	return chamarNfeGateway<NfeGatewayDistDfeResposta>("/sefaz/dist-dfe/chave", payload);
}

export async function consultarSituacaoChaveSefazGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	chaveNfe: string;
}): Promise<NfeGatewayConsultaChaveResposta> {
	return chamarNfeGateway<NfeGatewayConsultaChaveResposta>(
		"/sefaz/consulta-chave",
		payload,
	);
}

export async function manifestarCienciaOperacaoGateway(payload: {
	configJson: Record<string, unknown>;
	pfxBase64: string;
	senha: string;
	chaveNfe: string;
}): Promise<NfeGatewayManifestacaoResposta> {
	return chamarNfeGateway<NfeGatewayManifestacaoResposta>(
		"/nfe/manifestacao/ciencia",
		payload,
	);
}

export async function verificarSaudeNfeGateway(): Promise<boolean> {
	const { url } = obterConfigGateway();

	try {
		const resposta = await fetch(`${url}/health`);
		return resposta.ok;
	} catch {
		return false;
	}
}
