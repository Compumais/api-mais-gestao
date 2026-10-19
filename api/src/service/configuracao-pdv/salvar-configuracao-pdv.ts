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
	dados: Partial<ConfiguracaoPdvResposta>;
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

	const existente = await buscarConfiguracaoPdvPorEmpresa(idempresa);
	const mesclado: ConfiguracaoPdvResposta = {
		...paraResposta(existente),
		...dados,
	};

	const digitos = Number(mesclado.etiqueta_balanca_digitos_codigo);
	if (digitos !== 4 && digitos !== 5 && digitos !== 6) {
		return httpBadRequest("Dígitos do código da etiqueta devem ser 4, 5 ou 6");
	}

	const salva = await salvarConfiguracaoPdv({
		id: existente?.id ?? uuidv4(),
		idempresa,
		modeloatendimento:
			mesclado.modeloAtendimento === "comanda" ? "comanda" : "mesa",
		etiquetabalancahabilitada:
			mesclado.etiqueta_balanca_habilitada === "1" ? 1 : 0,
		etiquetabalancaprefixo:
			mesclado.etiqueta_balanca_prefixo.replace(/\D/g, "").slice(0, 1) || "2",
		etiquetabalancadigitoscodigo: digitos,
		etiquetabalancaconteudo:
			mesclado.etiqueta_balanca_conteudo === "peso" ? "peso" : "preco",
		etiquetabalancacentavos: mesclado.etiqueta_balanca_centavos === "0" ? 0 : 1,
		etiquetabalancaindicadoruso:
			mesclado.etiqueta_balanca_indicador_uso === "1" ? 1 : 0,
		vendasemestoque: mesclado.venda_sem_estoque === "1" ? 1 : 0,
		atualizadoem: new Date().toISOString(),
	});

	return httpOk(paraResposta(salva));
}
