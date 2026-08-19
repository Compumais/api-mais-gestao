import { v4 as uuidv4 } from "uuid";
import type { DominioIntegracaoPublica } from "@/model/dominio-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDominioIntegracao,
	buscarDominioIntegracaoPorEmpresa,
	criarDominioIntegracao,
} from "@/repositories/dominio-integracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criptografarTexto,
	descriptografarTexto,
} from "@/util/criptografia-certificado.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import { mapearDominioIntegracaoPublica } from "@/util/mascarar-chave-dominio.js";

type SalvarDominioIntegracaoParametros = {
	idusuario: string;
	idempresa: string;
	habilitado?: boolean;
	boxefile?: boolean;
	chavecontador?: string | null;
};

function descriptografarSePossivel(valor: string | null): string | null {
	if (!valor) return null;
	try {
		return descriptografarTexto(valor);
	} catch {
		return null;
	}
}

export async function salvarDominioIntegracaoService({
	idusuario,
	idempresa,
	habilitado,
	boxefile,
	chavecontador,
}: SalvarDominioIntegracaoParametros): Promise<
	HttpResponse<DominioIntegracaoPublica>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const agora = new Date().toISOString();
	const existente = await buscarDominioIntegracaoPorEmpresa(idempresa);
	const chaveTrim = chavecontador?.trim() || null;

	if (habilitado === true && !existente?.integrationkey && !chaveTrim) {
		return httpBadRequest(
			"Ative a integração com a chave do contador antes de habilitar o envio",
		);
	}

	if (existente) {
		const atualizado = await atualizarDominioIntegracao(existente.id, {
			...(habilitado !== undefined && !chaveTrim ? { habilitado } : {}),
			...(boxefile !== undefined ? { boxefile } : {}),
			...(chaveTrim
				? {
						chavecontador: criptografarTexto(chaveTrim),
						integrationkey: null,
						habilitado: false,
					}
				: {}),
			atualizadoem: agora,
		});

		if (!atualizado) {
			return httpBadRequest("Não foi possível salvar a integração Domínio");
		}

		const chavePlano =
			chaveTrim ?? descriptografarSePossivel(atualizado.chavecontador);
		return httpOk(mapearDominioIntegracaoPublica(atualizado, chavePlano));
	}

	const criado = await criarDominioIntegracao({
		id: uuidv4(),
		idempresa,
		habilitado: false,
		boxefile: boxefile ?? false,
		chavecontador: chaveTrim ? criptografarTexto(chaveTrim) : null,
		integrationkey: null,
		ultimoerro: null,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!criado) {
		return httpBadRequest("Não foi possível salvar a integração Domínio");
	}

	return httpOk(mapearDominioIntegracaoPublica(criado, chaveTrim));
}
