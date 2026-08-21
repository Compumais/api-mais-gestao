import type { OpenCnpjDados } from "@/model/consulta-cnpj-model.js";
import type { BrasilApiCnpj } from "@/service/localidade/brasil-api-client.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";

function boolParaSN(valor: boolean | null | undefined): string | null {
	if (valor === true) return "S";
	if (valor === false) return "N";
	return null;
}

function montarTelefone(
	ddd: string | null | undefined,
): string | null {
	if (!ddd) return null;
	const limpo = ddd.trim();
	return limpo || null;
}

export function mapearBrasilApiParaOpenCnpjDados(
	dados: BrasilApiCnpj,
): OpenCnpjDados {
	const cnaes = [];
	if (dados.cnae_fiscal != null) {
		cnaes.push({
			cnae: String(dados.cnae_fiscal),
			descricao: dados.cnae_fiscal_descricao ?? "",
		});
	}
	for (const sec of dados.cnaes_secundarios ?? []) {
		if (sec.codigo == null) continue;
		cnaes.push({
			cnae: String(sec.codigo),
			descricao: sec.descricao ?? "",
		});
	}

	return {
		cnpj: normalizarCnpj(dados.cnpj),
		situacaoCadastral: dados.descricao_situacao_cadastral ?? "DESCONHECIDA",
		dataSituacaoCadastral: dados.data_situacao_cadastral ?? null,
		motivoSituacaoCadastral:
			dados.descricao_motivo_situacao_cadastral ?? null,
		razaoSocial: dados.razao_social ?? "",
		nomeFantasia: dados.nome_fantasia ?? null,
		dataInicioAtividades: dados.data_inicio_atividade ?? null,
		matriz: dados.descricao_identificador_matriz_filial ?? null,
		naturezaJuridica: dados.natureza_juridica ?? null,
		capitalSocial:
			typeof dados.capital_social === "number" ? dados.capital_social : null,
		email: dados.email ?? null,
		telefone: montarTelefone(dados.ddd_telefone_1),
		logradouro: dados.logradouro ?? null,
		numero: dados.numero ?? null,
		complemento: dados.complemento ?? null,
		bairro: dados.bairro ?? null,
		municipio: dados.municipio ?? null,
		uf: dados.uf ?? null,
		cep: dados.cep ?? null,
		dataSituacaoEspecial: null,
		situacaoEspecial: null,
		opcaoSimples: boolParaSN(dados.opcao_pelo_simples),
		opcaoMei: boolParaSN(dados.opcao_pelo_mei),
		cnaes,
		socios: (dados.qsa ?? []).map((socio) => ({
			nomeSocio: socio.nome_socio ?? "",
			descricao: socio.qualificacao_socio ?? "",
			identificadorSocio: null,
			cnpjCpfSocio: socio.cnpj_cpf_do_socio ?? null,
			dataEntradaSociedade: socio.data_entrada_sociedade ?? null,
			nomeRepresentante: socio.nome_representante_legal ?? null,
			faixaEtaria: socio.faixa_etaria ?? null,
		})),
	};
}
