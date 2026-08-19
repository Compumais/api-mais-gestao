import { v4 as uuidv4 } from "uuid";
import type { DominioEnvio, DominioEnvioTipo } from "@/model/dominio-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDominioEnvio,
	buscarDominioEnvioPorNotaETipo,
	criarDominioEnvio,
} from "@/repositories/dominio-envio-repositories.js";
import { buscarDominioIntegracaoPorEmpresa } from "@/repositories/dominio-integracao-repositories.js";
import { httpOk } from "@/util/http-util.js";

type EnfileirarEnvioDominioParametros = {
	idempresa: string;
	idnotafiscal: string;
	tipo: DominioEnvioTipo;
	forcar?: boolean;
};

const STATUS_EM_ANDAMENTO = new Set([
	"pendente",
	"enviando",
	"aguardando_processamento",
]);

export async function enfileirarEnvioDominioService({
	idempresa,
	idnotafiscal,
	tipo,
	forcar = false,
}: EnfileirarEnvioDominioParametros): Promise<
	HttpResponse<DominioEnvio | null>
> {
	const integracao = await buscarDominioIntegracaoPorEmpresa(idempresa);
	if (!integracao?.habilitado || !integracao.integrationkey) {
		return httpOk(null);
	}

	const agora = new Date().toISOString();
	const existente = await buscarDominioEnvioPorNotaETipo(idnotafiscal, tipo);

	if (existente) {
		if (!forcar && existente.status === "armazenado") {
			return httpOk(existente);
		}
		if (!forcar && STATUS_EM_ANDAMENTO.has(existente.status)) {
			return httpOk(existente);
		}

		const atualizado = await atualizarDominioEnvio(existente.id, {
			status: "pendente",
			idloteapi: null,
			tentativas: 0,
			proximatentativa: agora,
			mensagemretorno: null,
			atualizadoem: agora,
		});

		return httpOk(atualizado ?? existente);
	}

	const criado = await criarDominioEnvio({
		id: uuidv4(),
		idempresa,
		idnotafiscal,
		tipo,
		status: "pendente",
		tentativas: 0,
		proximatentativa: agora,
		criadoem: agora,
		atualizadoem: agora,
	});

	return httpOk(criado ?? null);
}

export async function enfileirarEnvioDominioSilencioso(params: {
	idempresa: string;
	idnotafiscal: string;
	tipo: DominioEnvioTipo;
}): Promise<void> {
	try {
		await enfileirarEnvioDominioService(params);
	} catch (erro) {
		console.error("Falha ao enfileirar envio Domínio:", erro);
	}
}
