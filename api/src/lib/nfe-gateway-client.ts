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

		const corpo = (await resposta.json()) as T;

		if (!resposta.ok && corpo.sucesso !== true) {
			const erroGateway = corpo.erro ?? `Gateway retornou HTTP ${resposta.status}`;
			const erro =
				resposta.status === 401
					? "Falha de autenticação com o gateway NF-e. Verifique se NFE_GATEWAY_SECRET é o mesmo na API e no container Docker (api_Nfe/nfe-gateway/.env)."
					: erroGateway;

			return {
				sucesso: false,
				erro,
			} as T;
		}

		return corpo;
	} catch (erro) {
		const mensagem =
			erro instanceof Error ? erro.message : "Falha ao comunicar com nfe-gateway";
		return { sucesso: false, erro: mensagem } as T;
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

export async function verificarSaudeNfeGateway(): Promise<boolean> {
	const { url } = obterConfigGateway();

	try {
		const resposta = await fetch(`${url}/health`);
		return resposta.ok;
	} catch {
		return false;
	}
}
