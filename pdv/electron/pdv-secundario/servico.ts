import { v4 as uuidv4 } from "uuid";
import { getAllConfig, getConfig, setConfig } from "../db/database";
import {
	salvarAtalhos,
	salvarConfiguracoes,
	upsertGrupos,
	upsertGruposGourmet,
	upsertProdutos,
} from "../db/repos";
import {
	handshakePrincipal,
	NumeroPdvDuplicadoError,
	PrincipalOfflineError,
	pingIdentidade,
	puxarCatalogoRemoto,
	puxarConfigNegocioRemota,
	urlDoPrincipal,
} from "./cliente";
import {
	identidadePdvMudou,
	mesclarConfigNegocio,
	normalizarModoPdv,
	parseNumeroPdv,
} from "./regras";

export { NumeroPdvDuplicadoError, PrincipalOfflineError };

export type StatusPrincipal = {
	online: boolean;
	erro: string | null;
	numeropdvPrincipal: number | null;
	url: string | null;
};

let ultimoStatus: StatusPrincipal = {
	online: false,
	erro: null,
	numeropdvPrincipal: null,
	url: null,
};

export function statusPrincipalCache(): StatusPrincipal {
	return { ...ultimoStatus };
}

export async function obterIdentificadorLocal(): Promise<string> {
	const atual = (await getConfig("pdv_identificador", "")).trim();
	if (atual) {
		return atual;
	}
	const id = uuidv4();
	await setConfig("pdv_identificador", id);
	return id;
}

export async function ehSecundario(): Promise<boolean> {
	return (
		normalizarModoPdv(await getConfig("pdv_modo", "principal")) === "secundario"
	);
}

function urlConfigurada(host?: string, porta?: string): string {
	const h = (host ?? "").trim();
	if (!h) {
		throw new PrincipalOfflineError(
			"Informe o IP do PDV principal nas configurações.",
		);
	}
	return urlDoPrincipal(h, porta || "5050");
}

export async function conectarNoPrincipal(params?: {
	host?: string;
	porta?: string;
	numeropdv?: string;
}): Promise<{ token: string; url: string; numeropdvPrincipal: number }> {
	const host = params?.host ?? (await getConfig("pdv_principal_host", ""));
	const porta =
		params?.porta ?? (await getConfig("pdv_principal_porta", "5050"));
	const numeropdv = parseNumeroPdv(
		params?.numeropdv ?? (await getConfig("numeropdv", "1")),
	);
	if (!numeropdv) {
		throw new Error("Informe um número de PDV inteiro maior que zero.");
	}

	const url = urlConfigurada(host, porta);
	let identidade: Awaited<ReturnType<typeof pingIdentidade>>;
	try {
		identidade = await pingIdentidade(url);
	} catch (err) {
		ultimoStatus = {
			online: false,
			erro:
				err instanceof Error
					? err.message
					: "PDV principal offline ou inacessível.",
			numeropdvPrincipal: null,
			url,
		};
		throw err;
	}

	if (normalizarModoPdv(identidade.modo) === "secundario") {
		const erro =
			"O endereço apontado também está em modo secundário. Informe o PDV principal (onde fica o banco).";
		ultimoStatus = {
			online: false,
			erro,
			numeropdvPrincipal: identidade.numeropdv,
			url,
		};
		throw new Error(erro);
	}

	const identificador = await obterIdentificadorLocal();
	try {
		const hs = await handshakePrincipal(url, { numeropdv, identificador });
		await setConfig("pdv_principal_token", hs.token);
		ultimoStatus = {
			online: true,
			erro: null,
			numeropdvPrincipal: identidade.numeropdv,
			url,
		};
		return {
			token: hs.token,
			url,
			numeropdvPrincipal: identidade.numeropdv,
		};
	} catch (err) {
		ultimoStatus = {
			online: false,
			erro: err instanceof Error ? err.message : "Falha no handshake",
			numeropdvPrincipal: identidade.numeropdv,
			url,
		};
		throw err;
	}
}

export async function puxarDoPrincipal(): Promise<{
	produtos: number;
	grupos: number;
	gruposGourmet: number;
	atalhos: number;
}> {
	const host = await getConfig("pdv_principal_host", "");
	const porta = await getConfig("pdv_principal_porta", "5050");
	const url = urlConfigurada(host, porta);
	let token = (await getConfig("pdv_principal_token", "")).trim();
	if (!token) {
		const hs = await conectarNoPrincipal({ host, porta });
		token = hs.token;
	}

	let catalogo: Awaited<ReturnType<typeof puxarCatalogoRemoto>>;
	let remota: Record<string, string>;
	try {
		[catalogo, remota] = await Promise.all([
			puxarCatalogoRemoto(url, token),
			puxarConfigNegocioRemota(url, token),
		]);
	} catch (err) {
		if (err instanceof PrincipalOfflineError) {
			ultimoStatus = { ...ultimoStatus, online: false, erro: err.message, url };
		}
		throw err;
	}

	if (catalogo.grupos?.length) {
		await upsertGrupos(catalogo.grupos);
	}
	if (catalogo.gruposGourmet?.length) {
		await upsertGruposGourmet(catalogo.gruposGourmet);
	}
	if (catalogo.produtos?.length) {
		await upsertProdutos(catalogo.produtos);
	}
	if (catalogo.atalhos?.length) {
		await salvarAtalhos(catalogo.atalhos.map((a) => a.id).filter(Boolean));
	}

	const local = await getAllConfig();
	const mesclada = mesclarConfigNegocio(local, remota);
	const patch: Record<string, string> = {};
	for (const [chave, valor] of Object.entries(mesclada)) {
		if (local[chave] !== valor) {
			patch[chave] = valor;
		}
	}
	if (Object.keys(patch).length) {
		await salvarConfiguracoes(patch);
	}

	ultimoStatus = {
		online: true,
		erro: null,
		numeropdvPrincipal: ultimoStatus.numeropdvPrincipal,
		url,
	};

	return {
		produtos: catalogo.produtos?.length ?? 0,
		grupos: catalogo.grupos?.length ?? 0,
		gruposGourmet: catalogo.gruposGourmet?.length ?? 0,
		atalhos: catalogo.atalhos?.length ?? 0,
	};
}

export async function sincronizarSecundarioPeriodico(): Promise<void> {
	if (!(await ehSecundario())) {
		return;
	}
	try {
		await conectarNoPrincipal();
		await puxarDoPrincipal();
	} catch {
		// status já atualizado; operação continua bloqueada até reconectar
	}
}

export async function garantirOperacaoSecundario(): Promise<void> {
	if (!(await ehSecundario())) {
		return;
	}
	if (ultimoStatus.online) {
		return;
	}
	try {
		await conectarNoPrincipal();
	} catch (err) {
		throw new PrincipalOfflineError(
			err instanceof Error
				? err.message
				: "PDV principal offline. Operação bloqueada.",
		);
	}
}

export async function validarIdentidadeAoSalvar(
	proposto: Record<string, string>,
): Promise<void> {
	const atual = await getAllConfig();
	const modo = normalizarModoPdv(proposto.pdv_modo ?? atual.pdv_modo);
	if (modo !== "secundario") {
		return;
	}
	if (!identidadePdvMudou(atual, proposto) && atual.pdv_modo === "secundario") {
		return;
	}
	await conectarNoPrincipal({
		host: proposto.pdv_principal_host ?? atual.pdv_principal_host,
		porta: proposto.pdv_principal_porta ?? atual.pdv_principal_porta,
		numeropdv: proposto.numeropdv ?? atual.numeropdv,
	});
}

export async function testarConexaoPrincipal(params: {
	host: string;
	porta: string;
	numeropdv: string;
}): Promise<{ ok: true; mensagem: string; numeropdvPrincipal: number }> {
	const { numeropdvPrincipal } = await conectarNoPrincipal(params);
	return {
		ok: true,
		numeropdvPrincipal,
		mensagem: `Conectado ao PDV principal nº ${numeropdvPrincipal}. Número ${params.numeropdv} aceito.`,
	};
}
