import type { OpenCnpjDados } from "@/model/consulta-cnpj-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";

export type OpenCnpjOrgTelefone = {
	ddd?: string | null;
	numero?: string | null;
	is_fax?: boolean | null;
};

export type OpenCnpjOrgCnae = {
	codigo?: string | number | null;
	descricao?: string | null;
	is_principal?: boolean | null;
};

export type OpenCnpjOrgSocio = {
	nome_socio?: string | null;
	qualificacao_socio?: string | null;
	cnpj_cpf_socio?: string | null;
	data_entrada_sociedade?: string | null;
	nome_representante?: string | null;
	faixa_etaria?: string | null;
	identificador_socio?: string | null;
};

export type OpenCnpjOrgResposta = {
	cnpj?: string;
	razao_social?: string | null;
	nome_fantasia?: string | null;
	situacao_cadastral?: string | null;
	data_situacao_cadastral?: string | null;
	motivo_situacao_cadastral?:
		| string
		| { codigo?: string | null; descricao?: string | null }
		| null;
	matriz_filial?: string | null;
	data_inicio_atividade?: string | null;
	natureza_juridica?: string | null;
	capital_social?: string | number | null;
	email?: string | null;
	telefones?: OpenCnpjOrgTelefone[] | null;
	tipo_logradouro?: string | null;
	logradouro?: string | null;
	numero?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	municipio?: string | null;
	uf?: string | null;
	cep?: string | null;
	situacao_especial?: string | null;
	data_situacao_especial?: string | null;
	opcao_simples?: string | null;
	opcao_mei?: string | null;
	cnaes?: OpenCnpjOrgCnae[] | null;
	QSA?: OpenCnpjOrgSocio[] | null;
	error?: string;
};

function textoOuNulo(valor: string | null | undefined): string | null {
	if (valor == null) return null;
	const limpo = valor.trim();
	return limpo.length > 0 ? limpo : null;
}

function parseCapitalSocial(
	valor: string | number | null | undefined,
): number | null {
	if (typeof valor === "number" && Number.isFinite(valor)) {
		return valor;
	}
	if (typeof valor !== "string") return null;

	const limpo = valor.trim();
	if (!limpo) return null;

	const normalizado = limpo.includes(",")
		? limpo.replace(/\./g, "").replace(",", ".")
		: limpo;
	const numero = Number(normalizado);
	return Number.isFinite(numero) ? numero : null;
}

function montarTelefone(
	telefones: OpenCnpjOrgTelefone[] | null | undefined,
): string | null {
	const telefone = (telefones ?? []).find(
		(item) => !item.is_fax && textoOuNulo(item.numero),
	);
	if (!telefone?.numero) return null;

	const ddd = textoOuNulo(telefone.ddd);
	const numero = textoOuNulo(telefone.numero);
	if (!numero) return null;
	return ddd ? `(${ddd}) ${numero}` : numero;
}

function montarLogradouro(
	tipo: string | null | undefined,
	logradouro: string | null | undefined,
): string | null {
	const tipoLimpo = textoOuNulo(tipo);
	const logradouroLimpo = textoOuNulo(logradouro);
	if (!logradouroLimpo) return null;
	if (!tipoLimpo) return logradouroLimpo;
	if (logradouroLimpo.toUpperCase().startsWith(tipoLimpo.toUpperCase())) {
		return logradouroLimpo;
	}
	return `${tipoLimpo} ${logradouroLimpo}`;
}

function motivoSituacao(
	motivo:
		| string
		| { codigo?: string | null; descricao?: string | null }
		| null
		| undefined,
): string | null {
	if (motivo == null) return null;
	if (typeof motivo === "string") return textoOuNulo(motivo);
	return textoOuNulo(motivo.descricao);
}

export function mapearOpenCnpjOrgParaOpenCnpjDados(
	dados: OpenCnpjOrgResposta,
): OpenCnpjDados {
	const cnpj = normalizarCnpj(dados.cnpj ?? "");

	return {
		cnpj,
		situacaoCadastral:
			textoOuNulo(dados.situacao_cadastral) ?? "DESCONHECIDA",
		dataSituacaoCadastral: textoOuNulo(dados.data_situacao_cadastral),
		motivoSituacaoCadastral: motivoSituacao(dados.motivo_situacao_cadastral),
		razaoSocial: textoOuNulo(dados.razao_social) ?? "",
		nomeFantasia: textoOuNulo(dados.nome_fantasia),
		dataInicioAtividades: textoOuNulo(dados.data_inicio_atividade),
		matriz: textoOuNulo(dados.matriz_filial),
		naturezaJuridica: textoOuNulo(dados.natureza_juridica),
		capitalSocial: parseCapitalSocial(dados.capital_social),
		email: textoOuNulo(dados.email),
		telefone: montarTelefone(dados.telefones),
		logradouro: montarLogradouro(dados.tipo_logradouro, dados.logradouro),
		numero: textoOuNulo(dados.numero),
		complemento: textoOuNulo(dados.complemento),
		bairro: textoOuNulo(dados.bairro),
		municipio: textoOuNulo(dados.municipio),
		uf: textoOuNulo(dados.uf),
		cep: textoOuNulo(dados.cep),
		dataSituacaoEspecial: textoOuNulo(dados.data_situacao_especial),
		situacaoEspecial: textoOuNulo(dados.situacao_especial),
		opcaoSimples: textoOuNulo(dados.opcao_simples),
		opcaoMei: textoOuNulo(dados.opcao_mei),
		cnaes: (dados.cnaes ?? [])
			.filter((cnae) => cnae.codigo != null && String(cnae.codigo).length > 0)
			.map((cnae) => ({
				cnae: String(cnae.codigo),
				descricao: cnae.descricao ?? "",
			})),
		socios: (dados.QSA ?? []).map((socio) => ({
			nomeSocio: socio.nome_socio ?? "",
			descricao: socio.qualificacao_socio ?? "",
			identificadorSocio: null,
			cnpjCpfSocio: socio.cnpj_cpf_socio ?? null,
			dataEntradaSociedade: socio.data_entrada_sociedade ?? null,
			nomeRepresentante: textoOuNulo(socio.nome_representante),
			faixaEtaria: socio.faixa_etaria ?? null,
		})),
	};
}
