const AUDIENCE_PADRAO = "409f91f6-dc17-44c8-a5d8-e0a1bafd8b67";
const MARGEM_EXPIRACAO_MS = 5 * 60 * 1000;

type TokenCache = {
	token: string;
	expiraEm: number;
};

let tokenCache: TokenCache | null = null;

export type DominioActivationInfo = {
	nomeEscritorio: string | null;
	nomeCliente: string | null;
	cnpjCliente: string | null;
};

export type DominioEnvioLoteResultado = {
	idLote: string | null;
	mensagem: string;
	armazenado: boolean;
	bruto: unknown;
};

export type DominioCredenciaisErp = {
	clientId: string;
	clientSecret: string;
	audience: string;
	authUrl: string;
	apiUrl: string;
};

function obterTexto(valor: unknown): string | null {
	if (typeof valor === "string" && valor.trim()) {
		return valor.trim();
	}
	return null;
}

function comoObjeto(valor: unknown): Record<string, unknown> | null {
	if (valor && typeof valor === "object" && !Array.isArray(valor)) {
		return valor as Record<string, unknown>;
	}
	return null;
}

export function obterCredenciaisErpDominio(): DominioCredenciaisErp {
	const clientId = process.env.DOMINIO_CLIENT_ID?.trim();
	const clientSecret = process.env.DOMINIO_CLIENT_SECRET?.trim();

	if (!clientId || !clientSecret) {
		throw new Error(
			"Credenciais da API Domínio não configuradas (DOMINIO_CLIENT_ID / DOMINIO_CLIENT_SECRET)",
		);
	}

	return {
		clientId,
		clientSecret,
		audience: process.env.DOMINIO_AUDIENCE?.trim() || AUDIENCE_PADRAO,
		authUrl:
			process.env.DOMINIO_AUTH_URL?.trim() ||
			"https://auth.thomsonreuters.com/oauth/token",
		apiUrl: process.env.DOMINIO_API_URL?.trim() || "https://api.onvio.com.br",
	};
}

export function limparCacheTokenDominio() {
	tokenCache = null;
}

async function lerJson(resposta: Response): Promise<unknown> {
	const texto = await resposta.text();
	if (!texto.trim()) return null;
	try {
		return JSON.parse(texto) as unknown;
	} catch {
		return { message: texto };
	}
}

function mensagemDeErro(payload: unknown, fallback: string): string {
	const obj = comoObjeto(payload);
	if (!obj) return fallback;
	return (
		obterTexto(obj.message) ||
		obterTexto(obj.mensagem) ||
		obterTexto(obj.error) ||
		obterTexto(obj.error_description) ||
		fallback
	);
}

export async function obterTokenDominio(): Promise<string> {
	const agora = Date.now();
	if (tokenCache && tokenCache.expiraEm - MARGEM_EXPIRACAO_MS > agora) {
		return tokenCache.token;
	}

	const credenciais = obterCredenciaisErpDominio();
	const basic = Buffer.from(
		`${credenciais.clientId}:${credenciais.clientSecret}`,
	).toString("base64");

	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: credenciais.clientId,
		client_secret: credenciais.clientSecret,
		audience: credenciais.audience,
	});

	const resposta = await fetch(credenciais.authUrl, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basic}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	const payload = await lerJson(resposta);
	if (!resposta.ok) {
		throw new Error(
			mensagemDeErro(
				payload,
				`Falha ao obter token Domínio (${resposta.status})`,
			),
		);
	}

	const obj = comoObjeto(payload);
	const token = obterTexto(obj?.access_token);
	if (!token) {
		throw new Error("Resposta de token Domínio sem access_token");
	}

	const expiresIn = Number(obj?.expires_in);
	const validadeMs =
		Number.isFinite(expiresIn) && expiresIn > 0
			? expiresIn * 1000
			: 24 * 60 * 60 * 1000;

	tokenCache = {
		token,
		expiraEm: Date.now() + validadeMs,
	};

	return token;
}

function headersIntegracao(token: string, integrationKey: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		"x-integration-key": integrationKey,
	};
}

export function mapearActivationInfo(payload: unknown): DominioActivationInfo {
	const obj = comoObjeto(payload) ?? {};
	const nested = comoObjeto(obj.client) ?? comoObjeto(obj.company);
	const cnpj =
		obterTexto(obj.clientFederalId) ||
		obterTexto(obj.cnpjCliente) ||
		obterTexto(obj.federalId) ||
		obterTexto(obj.companyFederalId) ||
		obterTexto(obj.cnpj) ||
		obterTexto(nested?.cnpj) ||
		obterTexto(nested?.federalId);

	return {
		nomeEscritorio:
			obterTexto(obj.accountingOfficeName) ||
			obterTexto(obj.nomeEscritorio) ||
			obterTexto(obj.officeName) ||
			obterTexto(obj.accountingOffice),
		nomeCliente:
			obterTexto(obj.clientName) ||
			obterTexto(obj.nomeCliente) ||
			obterTexto(nested?.name) ||
			obterTexto(nested?.nome),
		cnpjCliente: cnpj,
	};
}

export async function consultarActivationInfoDominio(
	chaveContador: string,
): Promise<DominioActivationInfo> {
	const credenciais = obterCredenciaisErpDominio();
	const token = await obterTokenDominio();
	const url = `${credenciais.apiUrl}/dominio/integration/v1/activation/info`;

	const resposta = await fetch(url, {
		method: "GET",
		headers: headersIntegracao(token, chaveContador),
	});
	const payload = await lerJson(resposta);
	if (!resposta.ok) {
		throw new Error(
			mensagemDeErro(
				payload,
				`Falha ao confirmar a chave do contador (${resposta.status})`,
			),
		);
	}

	return mapearActivationInfo(payload);
}

export function extrairIntegrationKey(payload: unknown): string | null {
	const obj = comoObjeto(payload) ?? {};
	return (
		obterTexto(obj.integrationKey) ||
		obterTexto(obj.integration_key) ||
		obterTexto(obj.key)
	);
}

export async function habilitarActivationDominio(
	chaveContador: string,
): Promise<string> {
	const credenciais = obterCredenciaisErpDominio();
	const token = await obterTokenDominio();
	const url = `${credenciais.apiUrl}/dominio/integration/v1/activation/enable`;

	const resposta = await fetch(url, {
		method: "POST",
		headers: headersIntegracao(token, chaveContador),
	});
	const payload = await lerJson(resposta);
	if (!resposta.ok) {
		throw new Error(
			mensagemDeErro(
				payload,
				`Falha ao gerar a chave de integração Domínio (${resposta.status})`,
			),
		);
	}

	const integrationKey = extrairIntegrationKey(payload);
	if (!integrationKey) {
		throw new Error("API Domínio não retornou integrationKey");
	}

	return integrationKey;
}

export function interpretarConsultaLote(
	payload: unknown,
): DominioEnvioLoteResultado {
	const obj = comoObjeto(payload) ?? {};
	const mensagem =
		obterTexto(obj.message) ||
		obterTexto(obj.mensagem) ||
		obterTexto(obj.statusDescription) ||
		"";
	const status = obterTexto(obj.status) || obterTexto(obj.state) || "";
	const idLote =
		obterTexto(obj.id) ||
		obterTexto(obj.batchId) ||
		obterTexto(obj.protocol) ||
		obterTexto(obj.protocolId);

	const texto = `${status} ${mensagem}`.toLowerCase();
	const armazenado =
		texto.includes("armazenado") ||
		texto.includes("stored") ||
		status.toUpperCase() === "SUCCESS" ||
		status.toUpperCase() === "STORED";

	return { idLote, mensagem: mensagem || status, armazenado, bruto: payload };
}

export async function enviarXmlLoteDominio(params: {
	integrationKey: string;
	nomeArquivo: string;
	xml: string;
	boxeFile: boolean;
}): Promise<DominioEnvioLoteResultado> {
	const credenciais = obterCredenciaisErpDominio();
	const token = await obterTokenDominio();
	const url = `${credenciais.apiUrl}/dominio/invoice/v3/batches`;

	const form = new FormData();
	form.append(
		"file[]",
		new Blob([params.xml], { type: "application/xml" }),
		params.nomeArquivo,
	);
	form.append("query", JSON.stringify({ boxeFile: params.boxeFile }));

	const resposta = await fetch(url, {
		method: "POST",
		headers: headersIntegracao(token, params.integrationKey),
		body: form,
	});
	const payload = await lerJson(resposta);
	if (!resposta.ok) {
		throw new Error(
			mensagemDeErro(
				payload,
				`Falha ao enviar XML ao Domínio (${resposta.status})`,
			),
		);
	}

	return interpretarConsultaLote(payload);
}

export async function consultarLoteDominio(params: {
	integrationKey: string;
	idLote: string;
}): Promise<DominioEnvioLoteResultado> {
	const credenciais = obterCredenciaisErpDominio();
	const token = await obterTokenDominio();
	const url = `${credenciais.apiUrl}/dominio/invoice/v3/batches/${encodeURIComponent(params.idLote)}`;

	const resposta = await fetch(url, {
		method: "GET",
		headers: headersIntegracao(token, params.integrationKey),
	});
	const payload = await lerJson(resposta);
	if (!resposta.ok) {
		throw new Error(
			mensagemDeErro(
				payload,
				`Falha ao consultar lote Domínio (${resposta.status})`,
			),
		);
	}

	return interpretarConsultaLote(payload);
}
