const PERFIS_CONFIG_PDV = ["admin", "proprietario", "super"] as const;

export function normalizarPerfis(valor: unknown): string[] {
	if (Array.isArray(valor)) {
		return valor
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim().toLowerCase())
			.filter(Boolean);
	}
	if (typeof valor === "string" && valor.trim()) {
		try {
			const parsed = JSON.parse(valor) as unknown;
			if (Array.isArray(parsed)) {
				return normalizarPerfis(parsed);
			}
		} catch {
			// string simples: "admin"
		}
		return valor
			.split(/[,\s]+/)
			.map((item) => item.trim().toLowerCase())
			.filter(Boolean);
	}
	return [];
}

export function podeConfigurarPdv(roles: unknown): boolean {
	const perfis = normalizarPerfis(roles);
	return PERFIS_CONFIG_PDV.some((perfil) => perfis.includes(perfil));
}

export const MODULO_GOURMET = "gourmet";

export function planoTemGourmet(modulos: unknown): boolean {
	return normalizarPerfis(modulos).includes(MODULO_GOURMET);
}

export function sessaoTemGourmet(valor: unknown): boolean {
	if (valor === true || valor === 1) return true;
	if (typeof valor === "string") {
		const v = valor.trim().toLowerCase();
		return v === "1" || v === "true" || v === "sim";
	}
	return false;
}

/** Configurações de salão — só com módulo gourmet. */
export const CHAVES_CONFIG_GOURMET = [
	"modelo_atendimento",
	"qtd_mesas",
	"taxa_servico_percentual",
	"couvert_valor",
	"taxa_entrega_padrao",
	"bairros_entrega",
	"senha_gerencial",
	"senha_gerencial_hash",
	"senha_gerencial_salt",
	"senha_gerencial_habilitada",
	"tecnibra_habilitada",
	"tecnibra_xml_path",
	"tecnibra_intervalo_ms",
	"tecnibra_xml_root",
	"tecnibra_xml_item",
] as const;

/** Preferências do operador — qualquer usuário logado pode gravar. */
export const CHAVES_CONFIG_OPERADOR = [
	"filtro_apenas_abertas",
	"teclas_funcao",
	"teclado_virtual_pagamento",
] as const;

/** Sem sessão: conexão na tela de login (API, banco e identidade de PDV secundário). */
export const CHAVES_CONFIG_PRE_LOGIN = [
	"api_url",
	"database_url",
	"pdv_modo",
	"pdv_principal_host",
	"pdv_principal_porta",
	"numeropdv",
] as const;

export function payloadSoTemChaves(
	dados: Record<string, string>,
	permitidas: readonly string[],
): boolean {
	const chaves = Object.keys(dados);
	if (!chaves.length) return true;
	const set = new Set(permitidas);
	return chaves.every((chave) => set.has(chave));
}
