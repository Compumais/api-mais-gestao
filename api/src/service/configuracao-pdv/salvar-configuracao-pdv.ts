import { v4 as uuidv4 } from "uuid";
import type { ConfiguracaoPdvResposta } from "@/model/configuracao-pdv-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarConfiguracaoPdvPorEmpresa,
	salvarConfiguracaoPdv,
} from "@/repositories/configuracao-pdv-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import { paraResposta } from "./mapear-configuracao-pdv.js";

type SalvarConfiguracaoPdvParametros = {
	idusuario: string;
	idempresa: string;
	dados: ConfiguracaoPdvResposta;
};

export async function salvarConfiguracaoPdvService({
	idusuario,
	idempresa,
	dados,
}: SalvarConfiguracaoPdvParametros): Promise<
	HttpResponse<ConfiguracaoPdvResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const digitos = Number(dados.etiqueta_balanca_digitos_codigo);
	if (digitos !== 4 && digitos !== 5 && digitos !== 6) {
		return httpBadRequest("Dígitos do código da etiqueta devem ser 4, 5 ou 6");
	}

	const existente = await buscarConfiguracaoPdvPorEmpresa(idempresa);
	const salva = await salvarConfiguracaoPdv({
		id: existente?.id ?? uuidv4(),
		idempresa,
		modeloatendimento:
			dados.modeloAtendimento === "comanda" ? "comanda" : "mesa",
		etiquetabalancahabilitada:
			dados.etiqueta_balanca_habilitada === "1" ? 1 : 0,
		etiquetabalancaprefixo:
			dados.etiqueta_balanca_prefixo.replace(/\D/g, "").slice(0, 1) || "2",
		etiquetabalancadigitoscodigo: digitos,
		etiquetabalancaconteudo:
			dados.etiqueta_balanca_conteudo === "peso" ? "peso" : "preco",
		etiquetabalancacentavos: dados.etiqueta_balanca_centavos === "0" ? 0 : 1,
		etiquetabalancaindicadoruso:
			dados.etiqueta_balanca_indicador_uso === "1" ? 1 : 0,
		atualizadoem: new Date().toISOString(),
	});

	return httpOk(paraResposta(salva));
}
