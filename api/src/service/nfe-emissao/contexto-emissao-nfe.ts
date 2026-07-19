import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarCertificadoAtivoPorEmpresa } from "@/repositories/certificado-digital-repositories.js";
import { buscarNfeConfiguracaoPorEmpresa } from "@/repositories/nfe-configuracao-repositories.js";
import { buscarNfeSeriePadrao } from "@/repositories/nfe-serie-repositories.js";
import {
	descriptografarCredenciaisCertificado,
	montarConfigJsonSpedNfe,
	obterCodigoUfIbge,
} from "@/util/montar-config-sped-nfe.js";
import { NFE_CONFIG_PADRAO } from "@/util/nfe-config-padrao.js";
import { montarIeEmitenteNfe, ajustarDestinatarioAmbienteNfe } from "@/util/normalizar-ie-nfe.js";
import { resolverIdeEmissaoNfe } from "@/util/resolver-ide-emissao-nfe.js";
import { validarPreRequisitosEmissaoNfe } from "@/util/validar-pre-requisitos-emissao-nfe.js";
import { agoraBrasiliaIsoOffset } from "@/util/data-hora-brasilia.js";

export type ItemPayloadNfe = {
	idproduto?: string;
	codigoProduto?: string;
	ean?: string;
	eanTributavel?: string;
	descricao: string;
	ncm: string;
	cfop: string;
	unidade: string;
	quantidade: number;
	valorUnitario: number;
	cst?: string;
	csosn?: string;
	orig?: number;
	cstPis?: string;
	cstCofins?: string;
	aliquotaPis?: number;
	aliquotaCofins?: number;
	baseIcms?: number;
	aliquotaIcms?: number;
	valorIcms?: number;
	valorIpi?: number;
	valorIpiDevol?: number;
	baseIcmsSt?: number;
	valorIcmsSt?: number;
	valorFcpSt?: number;
	valorFcpStRet?: number;
	valorIcmsDesonerado?: number;
	valorIcmsMonoRet?: number;
	valorIcmsMonoReten?: number;
	pCredSN?: number;
	vCredICMSSN?: number;
};

export type DestinatarioPayloadNfe = {
	cnpjcpf?: string;
	razaosocial?: string;
	ie?: string;
	logradouro?: string;
	numero?: string;
	bairro?: string;
	cep?: string;
	cidade?: string;
	estado?: string;
	codigomunicipioibge?: string;
	indIEDest?: number;
	pais?: string;
};

export type PagamentoPayloadNfe = {
	formas: Array<{
		tPag: string;
		vPag: number;
		indPag?: number;
		card?: {
			tpIntegra: 1 | 2;
			CNPJ?: string;
			tBand?: string;
			cAut?: string;
		};
	}>;
};

export type TotaisPayloadNfe = {
	frete?: number;
	seguro?: number;
	desconto?: number;
	outrasDespesas?: number;
};

export type TransportePayloadNfe = {
	modFrete?: number;
};

export type DocumentoReferenciadoPayloadNfe = {
	chave: string;
	modelo?: string;
	serie?: string;
	numero?: string;
	dataEmissao?: string;
	idnotafiscalReferenciada?: string;
};

export async function carregarContextoEmissaoNfe(idempresa: string) {
	const empresa = await buscarEmpresaPorId(idempresa);
	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const nfeConfiguracao = await buscarNfeConfiguracaoPorEmpresa(idempresa);
	const certificadoAtivo = await buscarCertificadoAtivoPorEmpresa(idempresa);
	const seriePadrao = await buscarNfeSeriePadrao(idempresa, "55");

	const pendencias = validarPreRequisitosEmissaoNfe({
		empresa: empresa!,
		empresaFiscal,
		nfeConfiguracao,
		certificadoAtivo: certificadoAtivo
			? {
					id: certificadoAtivo.id,
					idempresa: certificadoAtivo.idempresa,
					apelido: certificadoAtivo.apelido,
					cnpjcertificado: certificadoAtivo.cnpjcertificado,
					validadeinicio: certificadoAtivo.validadeinicio,
					validadefim: certificadoAtivo.validadefim,
					serial: certificadoAtivo.serial,
					thumbprint: certificadoAtivo.thumbprint,
					ativo: certificadoAtivo.ativo,
					criadoem: certificadoAtivo.criadoem,
					atualizadoem: certificadoAtivo.atualizadoem,
				}
			: undefined,
		seriePadrao,
	});

	return {
		empresa,
		empresaFiscal,
		nfeConfiguracao,
		certificadoAtivo,
		seriePadrao,
		pendencias,
	};
}

export function montarPayloadGatewayEmissao({
	empresa,
	empresaFiscal,
	nfeConfiguracao,
	certificadoAtivo,
	numeroNf,
	serie,
}: {
	empresa: NonNullable<Awaited<ReturnType<typeof buscarEmpresaPorId>>>;
	empresaFiscal: NonNullable<
		Awaited<ReturnType<typeof buscarEmpresaFiscalPorEmpresa>>
	>;
	nfeConfiguracao: NonNullable<
		Awaited<ReturnType<typeof buscarNfeConfiguracaoPorEmpresa>>
	>;
	certificadoAtivo: NonNullable<
		Awaited<ReturnType<typeof buscarCertificadoAtivoPorEmpresa>>
	>;
	numeroNf: number;
	serie: string;
}) {
	const configJson = montarConfigJsonSpedNfe({
		empresa,
		empresaFiscal,
		nfeConfiguracao,
	});

	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);

	const crt = empresaFiscal.crt ?? 3;
	const csosn = crt === 1 || crt === 2 || crt === 4 ? "102" : undefined;
	const cst = crt === 3 ? "00" : undefined;

	return {
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		payloadNfe: {
			emitente: {
				cnpj: empresa.cnpj.replace(/\D/g, ""),
				razaoSocial: empresaFiscal.razaosocial,
				nomeFantasia: empresaFiscal.nomefantasia ?? empresaFiscal.razaosocial,
				ie: montarIeEmitenteNfe(empresaFiscal.inscricaoestadual),
				crt,
				logradouro: empresaFiscal.logradouro,
				numero: empresaFiscal.numero,
				complemento: empresaFiscal.complemento ?? "",
				bairro: empresaFiscal.bairro,
				codigoMunicipio: empresaFiscal.codigomunicipioibge,
				municipio: empresaFiscal.codigomunicipioibge,
				uf: empresaFiscal.uf,
				cep: empresaFiscal.cep?.replace(/\D/g, ""),
				telefone: empresaFiscal.telefone ?? "",
				email: empresaFiscal.email ?? empresa.email,
			},
			ide: {
				cUF: obterCodigoUfIbge(empresaFiscal.uf ?? ""),
				serie: Number(serie),
				nNF: numeroNf,
				dhEmi: agoraBrasiliaIsoOffset(),
				tpAmb: nfeConfiguracao.ambiente,
				verProc: NFE_CONFIG_PADRAO.verproc,
			},
			item: {
				cProd: "000001",
				xProd: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
				ncm: "61091000",
				cfop: "5102",
				uCom: "UN",
				qCom: 1,
				vUnCom: 1.0,
				uTrib: "UN",
				qTrib: 1,
				vUnTrib: 1.0,
				indTot: 1,
				csosn,
				cst,
				orig: 0,
			},
		},
	};
}

export function montarPayloadGatewayEmissaoItens({
	empresa,
	empresaFiscal,
	nfeConfiguracao,
	certificadoAtivo,
	numeroNf,
	serie,
	destinatario,
	itens,
	totais,
	pagamento,
	transporte,
	natOp,
	informacoesAdicionais,
	finNFe,
	tpNF,
	documentosReferenciados,
	indPres,
}: {
	empresa: NonNullable<Awaited<ReturnType<typeof buscarEmpresaPorId>>>;
	empresaFiscal: NonNullable<Awaited<ReturnType<typeof buscarEmpresaFiscalPorEmpresa>>>;
	nfeConfiguracao: NonNullable<Awaited<ReturnType<typeof buscarNfeConfiguracaoPorEmpresa>>>;
	certificadoAtivo: NonNullable<Awaited<ReturnType<typeof buscarCertificadoAtivoPorEmpresa>>>;
	numeroNf: number;
	serie: string;
	destinatario?: DestinatarioPayloadNfe;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
	pagamento?: PagamentoPayloadNfe;
	transporte?: TransportePayloadNfe;
	natOp?: string;
	informacoesAdicionais?: string;
	finNFe?: number;
	tpNF?: number;
	documentosReferenciados?: DocumentoReferenciadoPayloadNfe[];
	indPres?: number;
}) {
	const configJson = montarConfigJsonSpedNfe({ empresa, empresaFiscal, nfeConfiguracao });
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);
	const ide = resolverIdeEmissaoNfe({
		ufEmitente: empresaFiscal.uf,
		ufDestinatario: destinatario?.estado,
		paisDestinatario: destinatario?.pais,
		indPres,
		finNFe,
	});

	return {
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		payloadNfe: {
			emitente: {
				cnpj: empresa.cnpj.replace(/\D/g, ""),
				razaoSocial: empresaFiscal.razaosocial,
				nomeFantasia: empresaFiscal.nomefantasia ?? empresaFiscal.razaosocial,
				ie: montarIeEmitenteNfe(empresaFiscal.inscricaoestadual),
				crt: empresaFiscal.crt ?? 3,
				logradouro: empresaFiscal.logradouro,
				numero: empresaFiscal.numero,
				complemento: empresaFiscal.complemento ?? "",
				bairro: empresaFiscal.bairro,
				codigoMunicipio: empresaFiscal.codigomunicipioibge,
				municipio: empresaFiscal.codigomunicipioibge,
				uf: empresaFiscal.uf,
				cep: empresaFiscal.cep?.replace(/\D/g, ""),
				telefone: empresaFiscal.telefone ?? "",
				email: empresaFiscal.email ?? empresa.email,
			},
			ide: {
				cUF: obterCodigoUfIbge(empresaFiscal.uf ?? ""),
				natOp: natOp?.trim() || "VENDA",
				serie: Number(serie),
				nNF: numeroNf,
				dhEmi: agoraBrasiliaIsoOffset(),
				tpAmb: nfeConfiguracao.ambiente,
				verProc: NFE_CONFIG_PADRAO.verproc,
				idDest: ide.idDest,
				indFinal: ide.indFinal,
				indPres: ide.indPres,
				finNFe: finNFe ?? 1,
				tpNF: tpNF ?? 1,
			},
			documentosReferenciados: (documentosReferenciados ?? []).map((doc) => ({
				refNFe: doc.chave.replace(/\D/g, ""),
			})),
			destinatario: ajustarDestinatarioAmbienteNfe(
				destinatario,
				nfeConfiguracao.ambiente,
			) ?? {},
			itens,
			totais: totais ?? {},
			pagamento: pagamento ?? {},
			transporte: transporte ?? {},
			informacoesAdicionais: informacoesAdicionais ?? "",
		},
	};
}
