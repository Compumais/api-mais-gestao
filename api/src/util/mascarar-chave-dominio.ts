import type {
	DominioIntegracao,
	DominioIntegracaoPublica,
} from "@/model/dominio-model.js";
import { descriptografarTexto } from "@/util/criptografia-certificado.js";

export function mascararChaveDominio(
	chave: string | null | undefined,
): string | null {
	if (!chave?.trim()) return null;
	const valor = chave.trim();
	if (valor.length <= 4) return "****";
	return `****${valor.slice(-4)}`;
}

export function descriptografarChaveDominio(
	valor: string | null,
): string | null {
	if (!valor) return null;
	try {
		return descriptografarTexto(valor);
	} catch {
		return null;
	}
}

export function mapearDominioIntegracaoPublica(
	registro: DominioIntegracao,
	chaveContadorPlano?: string | null,
): DominioIntegracaoPublica {
	return {
		id: registro.id,
		idempresa: registro.idempresa,
		habilitado: registro.habilitado,
		boxefile: registro.boxefile,
		chavecontadorMascarada: mascararChaveDominio(chaveContadorPlano ?? null),
		chaveConfigurada: Boolean(registro.chavecontador),
		integrationKeyConfigurada: Boolean(registro.integrationkey),
		nomeescritorio: registro.nomeescritorio,
		nomecliente: registro.nomecliente,
		cnpjcliente: registro.cnpjcliente,
		ultimoerro: registro.ultimoerro,
		ativadoem: registro.ativadoem,
		criadoem: registro.criadoem,
		atualizadoem: registro.atualizadoem,
	};
}
