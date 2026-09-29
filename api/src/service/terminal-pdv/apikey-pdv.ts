import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarInstanceTerminalPdv,
	buscarTerminalPdvPorApiKeyHash,
	gerarPdvApiKeyPlaintext,
	gravarApiKeyTerminalPdv,
	hashPdvApiKey,
	instanceLeaseAtiva,
	PDV_API_KEY_PREFIX,
} from "@/repositories/terminal-pdv-apikey.js";
import { buscarTerminalPdvPorId } from "@/repositories/terminal-pdv-repositories.js";
import {
	httpBadRequest,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ParametrosBase = {
	idempresa: string;
	idusuario: string;
};

export async function gerarApiKeyTerminalPdvService({
	id,
	idempresa,
	idusuario,
}: ParametrosBase & { id: string }): Promise<
	HttpResponse<{
		id: string;
		apiKey: string;
		prefix: string;
		numeropdv: number;
		aviso: string;
	} | null>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) {
		return httpProibido();
	}

	const existente = await buscarTerminalPdvPorId(id);
	if (!existente || existente.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}
	if (!existente.ativo) {
		return httpBadRequest("Ative o terminal antes de gerar a API key");
	}

	const gerada = gerarPdvApiKeyPlaintext();
	const gravado = await gravarApiKeyTerminalPdv(id, {
		hash: gerada.hash,
		prefix: gerada.prefix,
	});
	if (!gravado) {
		return httpErro();
	}

	return httpOk({
		id,
		apiKey: gerada.apiKey,
		prefix: gerada.prefix,
		numeropdv: existente.numeropdv,
		aviso:
			"Copie a API key agora. Ela não será exibida novamente. Só uma instância do PDV pode usar esta key por vez.",
	});
}

export async function autenticarDevicePdvService(params: {
	apiKey: string;
	instanceId: string;
	forcar?: boolean;
}): Promise<
	HttpResponse<{
		idempresa: string;
		numeropdv: number;
		descricao: string | null;
		terminalId: string;
		instanceId: string;
	} | null>
> {
	const apiKey = params.apiKey.trim();
	const instanceId = params.instanceId.trim();
	if (!apiKey.startsWith(PDV_API_KEY_PREFIX) || !instanceId) {
		return httpBadRequest("API key ou instanceId inválidos");
	}

	const terminal = await buscarTerminalPdvPorApiKeyHash(hashPdvApiKey(apiKey));
	if (!terminal || !terminal.ativo) {
		return {
			success: false as const,
			status: 401,
			error: "API key inválida ou terminal inativo",
			code: "PDV_API_KEY_INVALIDA",
		};
	}

	if (
		!params.forcar &&
		instanceLeaseAtiva(terminal.instance_id, terminal.instance_visto_em, instanceId)
	) {
		return {
			success: false as const,
			status: 409,
			error:
				"Esta API key já está em uso por outro PDV. Desconecte a outra instância ou force a autenticação.",
			code: "PDV_API_KEY_EM_USO",
		};
	}

	await atualizarInstanceTerminalPdv(terminal.id, instanceId);

	return httpOk({
		idempresa: terminal.idempresa,
		numeropdv: terminal.numeropdv,
		descricao: terminal.descricao,
		terminalId: terminal.id,
		instanceId,
	});
}

export async function resolverTerminalPorBearerApiKey(params: {
	apiKey: string;
	instanceId?: string | null;
}): Promise<
	| {
			ok: true;
			terminal: Awaited<ReturnType<typeof buscarTerminalPdvPorApiKeyHash>>;
	  }
	| { ok: false; status: number; error: string; code: string }
> {
	const apiKey = params.apiKey.trim();
	if (!apiKey.startsWith(PDV_API_KEY_PREFIX)) {
		return {
			ok: false,
			status: 401,
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		};
	}
	const terminal = await buscarTerminalPdvPorApiKeyHash(hashPdvApiKey(apiKey));
	if (!terminal || !terminal.ativo) {
		return {
			ok: false,
			status: 401,
			error: "API key inválida",
			code: "PDV_API_KEY_INVALIDA",
		};
	}
	const instanceId = params.instanceId?.trim() || "";
	if (instanceId) {
		if (
			instanceLeaseAtiva(
				terminal.instance_id,
				terminal.instance_visto_em,
				instanceId,
			)
		) {
			return {
				ok: false,
				status: 409,
				error: "API key em uso por outra instância",
				code: "PDV_API_KEY_EM_USO",
			};
		}
		await atualizarInstanceTerminalPdv(terminal.id, instanceId);
	}
	return { ok: true, terminal };
}
