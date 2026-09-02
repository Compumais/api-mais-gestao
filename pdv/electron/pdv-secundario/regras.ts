export type ModoPdv = "principal" | "secundario";

export const CHAVES_CONFIG_NEGOCIO = [
	"qtd_mesas",
	"modelo_atendimento",
	"tempo_ociosidade_min",
	"emitir_nfce",
	"nfce_meios_pagamento",
	"pix_chave",
	"api_url",
	"taxa_servico_percentual",
	"couvert_valor",
	"terminais_pdv_json",
	"etiqueta_balanca_habilitada",
	"etiqueta_balanca_prefixo",
	"etiqueta_balanca_digitos_codigo",
	"etiqueta_balanca_conteudo",
	"etiqueta_balanca_centavos",
	"etiqueta_balanca_indicador_uso",
	"taxa_entrega_padrao",
	"bairros_entrega",
] as const;

export type ChaveConfigNegocio = (typeof CHAVES_CONFIG_NEGOCIO)[number];

/** Hardware, identidade e caminhos locais — nunca copiar do principal. */
export const CHAVES_CONFIG_LOCAL = [
	"numeropdv",
	"pdv_modo",
	"pdv_principal_host",
	"pdv_principal_porta",
	"pdv_identificador",
	"pdv_principal_token",
	"database_url",
	"lan_habilitada",
	"lan_porta",
	"impressora_nome",
	"impressora_tipo",
	"impressora_host",
	"impressora_porta",
	"certificado_path",
	"certificado_senha",
	"certificado_apelido",
	"certificado_validade",
	"fiscal_ultima_sync",
	"fiscal_sync_erro",
	"tecnibra_habilitada",
	"tecnibra_xml_path",
	"tecnibra_intervalo_ms",
	"tecnibra_xml_root",
	"tecnibra_xml_item",
	"sitef_habilitado",
	"sitef_ip",
	"sitef_loja",
	"sitef_terminal",
	"sitef_parametros",
	"sitef_porta_pinpad",
	"sitef_dll_path",
	"balanca_habilitada",
	"balanca_porta",
	"balanca_baud",
	"balanca_protocolo",
	"tema",
	"senha_gerencial_hash",
	"senha_gerencial_salt",
	"senha_gerencial_habilitada",
] as const;

export type ResultadoNumeroPdv =
	| { ok: true; numero: number }
	| {
			ok: false;
			codigo: "invalido" | "mesmo_principal" | "duplicado";
			mensagem: string;
	  };

export function normalizarModoPdv(valor: string | undefined | null): ModoPdv {
	return valor === "secundario" ? "secundario" : "principal";
}

export function parseNumeroPdv(
	valor: string | number | undefined | null,
): number {
	const n =
		typeof valor === "number" ? valor : Number(String(valor ?? "").trim());
	if (!Number.isInteger(n) || n < 1) {
		return 0;
	}
	return n;
}

/**
 * Monta a URL HTTP do PDV principal (LAN).
 * Aceita host com ou sem esquema; ignora path; porta no host cede à porta explícita.
 */
export function montarUrlPrincipal(
	host: string,
	porta?: string | number,
): string {
	const bruto = host.trim();
	if (!bruto) {
		throw new Error("Informe o IP ou hostname do PDV principal.");
	}
	const semEsquema = bruto.replace(/^https?:\/\//i, "");
	const semPath = semEsquema.split("/")[0] ?? "";
	const hostname = semPath.replace(/:\d+$/, "").trim();
	if (!hostname) {
		throw new Error("Informe o IP ou hostname do PDV principal.");
	}
	const portaNum = Math.max(1, Number(porta) || 5050);
	return `http://${hostname}:${portaNum}`;
}

export function validarNumeroPdv(params: {
	proposto: string | number;
	numeroPrincipal: number;
	ocupados?: number[];
}): ResultadoNumeroPdv {
	const numero = parseNumeroPdv(params.proposto);
	if (!numero) {
		return {
			ok: false,
			codigo: "invalido",
			mensagem: "Informe um número de PDV inteiro maior que zero.",
		};
	}
	if (numero === params.numeroPrincipal) {
		return {
			ok: false,
			codigo: "mesmo_principal",
			mensagem: `O número ${numero} é o do PDV principal. Escolha outro para o secundário.`,
		};
	}
	const ocupados = params.ocupados ?? [];
	if (ocupados.includes(numero)) {
		return {
			ok: false,
			codigo: "duplicado",
			mensagem: `Já existe um PDV com o número ${numero} conectado ao principal.`,
		};
	}
	return { ok: true, numero };
}

/**
 * Aplica só chaves de negócio do principal. Hardware/SiTef/impressora/identidade
 * do local prevalecem mesmo se a remota as enviar.
 */
export function mesclarConfigNegocio(
	local: Record<string, string>,
	remota: Record<string, string>,
): Record<string, string> {
	const localSet = new Set<string>(CHAVES_CONFIG_LOCAL);
	const negocioSet = new Set<string>(CHAVES_CONFIG_NEGOCIO);
	const saida: Record<string, string> = { ...local };
	for (const [chave, valor] of Object.entries(remota)) {
		if (localSet.has(chave)) {
			continue;
		}
		if (!negocioSet.has(chave)) {
			continue;
		}
		if (typeof valor === "string") {
			saida[chave] = valor;
		}
	}
	return saida;
}

export function extrairConfigNegocio(
	config: Record<string, string>,
): Record<string, string> {
	const saida: Record<string, string> = {};
	for (const chave of CHAVES_CONFIG_NEGOCIO) {
		if (config[chave] !== undefined) {
			saida[chave] = config[chave];
		}
	}
	return saida;
}

export function identidadePdvMudou(
	atual: Record<string, string>,
	proposto: Record<string, string>,
): boolean {
	const campos = [
		"pdv_modo",
		"numeropdv",
		"pdv_principal_host",
		"pdv_principal_porta",
	] as const;
	return campos.some(
		(chave) =>
			proposto[chave] !== undefined && proposto[chave] !== (atual[chave] ?? ""),
	);
}
