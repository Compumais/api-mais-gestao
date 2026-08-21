import type { HttpResponse } from "@/model/http-model.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import {
	MODELOS_GEMINI,
	MODELOS_OPENAI,
	MODELOS_OPENROUTER,
	type ProvedorIa,
	testarConexaoIa,
	type ResultadoTesteIa,
} from "@/service/ia/provedores.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

type TestarIaParametros = {
	idusuario: string;
	idempresa: string;
	provedor: ProvedorIa;
	apiKey?: string;
	modelo?: string;
};

export async function testarIaService({
	idusuario,
	idempresa,
	provedor,
	apiKey,
	modelo,
}: TestarIaParametros): Promise<HttpResponse<ResultadoTesteIa>> {
	let chave = apiKey?.trim();

	if (!chave) {
		const config = await buscarConfiguracaoUsuarioService({
			idusuario,
			idempresa,
		});
		if (!config.success || !config.body) {
			return httpBadRequest({
				error: "Nenhuma chave salva. Informe a chave no formulário e teste.",
			});
		}
		const i = config.body.integracoes;
		chave =
			provedor === "openai"
				? i.openaiApiKey?.trim()
				: provedor === "gemini"
					? i.geminiApiKey?.trim()
					: i.openrouterApiKey?.trim();

		if (!modelo) {
			modelo =
				provedor === "openai"
					? i.modeloOpenai ?? undefined
					: provedor === "gemini"
						? i.modeloGemini ?? undefined
						: i.modeloOpenrouter ?? undefined;
		}
	}

	if (!chave) {
		return httpBadRequest({
			error: `Chave ${provedor} não informada. Preencha o campo ou salve antes de testar.`,
		});
	}

	const resultado = await testarConexaoIa({
		provedor,
		apiKey: chave,
		modelo:
			modelo ||
			(provedor === "openai"
				? MODELOS_OPENAI[0]
				: provedor === "gemini"
					? MODELOS_GEMINI[0]
					: MODELOS_OPENROUTER[0]),
	});

	return httpOk(resultado);
}
