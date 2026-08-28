import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { calcularTributosAproximadosIbpt } from "@/service/nfe-emissao/calcular-tributos-aproximados-ibpt.js";
import { aplicarTributacaoItensEmissaoNfe } from "@/service/nfe-emissao/calcular-tributos-itens-emissao-nfe.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { completarRastrosItensEmissao } from "@/service/lote/completar-rastros-emissao.js";
import { montarObservacoesLegaisNfe } from "@/util/montar-observacoes-legais-nfe.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ResultadoCalcularObservacoesLegaisNfe = {
	informacoesAdicionais?: string;
	textoUsuario?: string;
	legendaSimples?: string;
	textoIbpt?: string;
	tributosIbpt: {
		totalFederal: number;
		totalEstadual: number;
		totalMunicipal: number;
		totalAproximado: number;
		chave?: string;
		fonte?: string;
	};
	pendencias: string[];
};

export async function calcularObservacoesLegaisNfeService(params: {
	idusuario: string;
	idempresa: string;
	informacoesAdicionais?: string;
	itens: ItemPayloadNfe[];
}): Promise<HttpResponse<ResultadoCalcularObservacoesLegaisNfe>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	if (!params.itens?.length) {
		return httpBadRequest("Informe ao menos um item para calcular observações");
	}

	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(params.idempresa);
	if (!empresaFiscal) {
		return httpNaoEncontrado("Cadastro fiscal da empresa não encontrado");
	}

	const crt = empresaFiscal.crt ?? 3;
	const { itens: itensTributados, pendencias: pendenciasTributacao } =
		await aplicarTributacaoItensEmissaoNfe({
			crt,
			itens: params.itens,
		});

	if (pendenciasTributacao.length > 0) {
		return httpBadRequest(pendenciasTributacao.join("; "));
	}

	const { itens: itensComRastros } = await completarRastrosItensEmissao({
		idempresa: params.idempresa,
		itens: itensTributados,
	});

	const tributosIbpt = await calcularTributosAproximadosIbpt({
		uf: empresaFiscal.uf ?? "",
		itens: itensComRastros,
	});

	const observacoes = montarObservacoesLegaisNfe({
		informacoesAdicionais: params.informacoesAdicionais,
		crt,
		itens: tributosIbpt.itens,
		tributosIbpt,
	});

	return httpOk({
		informacoesAdicionais: observacoes.informacoesAdicionais,
		textoUsuario: observacoes.textoUsuario,
		legendaSimples: observacoes.legendaSimples,
		textoIbpt: observacoes.textoIbpt,
		tributosIbpt: {
			totalFederal: tributosIbpt.totalFederal,
			totalEstadual: tributosIbpt.totalEstadual,
			totalMunicipal: tributosIbpt.totalMunicipal,
			totalAproximado: tributosIbpt.totalAproximado,
			chave: tributosIbpt.chave,
			fonte: tributosIbpt.fonte,
		},
		pendencias: tributosIbpt.pendencias,
	});
}
