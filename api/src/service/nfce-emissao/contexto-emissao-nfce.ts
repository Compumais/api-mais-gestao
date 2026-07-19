import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarCertificadoAtivoPorEmpresa } from "@/repositories/certificado-digital-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { buscarNfeSeriePadrao } from "@/repositories/nfe-serie-repositories.js";
import type {
	ItemPayloadNfe,
	PagamentoPayloadNfe,
	TotaisPayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	descriptografarCredenciaisCertificado,
	obterCodigoUfIbge,
} from "@/util/montar-config-sped-nfe.js";
import { montarConfigJsonSpedNfce } from "@/util/montar-config-sped-nfce.js";
import { montarIeEmitenteNfe } from "@/util/normalizar-ie-nfe.js";
import { validarPreRequisitosEmissaoNfce } from "@/util/validar-pre-requisitos-emissao-nfce.js";
import { agoraBrasiliaIsoOffset } from "@/util/data-hora-brasilia.js";

export async function carregarContextoEmissaoNfce(idempresa: string) {
	const empresa = await buscarEmpresaPorId(idempresa);
	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const nfceConfiguracao = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const certificadoAtivo = await buscarCertificadoAtivoPorEmpresa(idempresa);
	const seriePadrao = await buscarNfeSeriePadrao(idempresa, "65");

	const pendencias = validarPreRequisitosEmissaoNfce({
		empresa: empresa!,
		empresaFiscal,
		nfceConfiguracao,
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
		nfceConfiguracao,
		certificadoAtivo,
		seriePadrao,
		pendencias,
	};
}

export function montarPayloadGatewayEmissaoNfce({
	empresa,
	empresaFiscal,
	nfceConfiguracao,
	certificadoAtivo,
	numeroNf,
	serie,
	itens,
	totais,
	pagamento,
	natOp,
	informacoesAdicionais,
}: {
	empresa: NonNullable<Awaited<ReturnType<typeof buscarEmpresaPorId>>>;
	empresaFiscal: NonNullable<
		Awaited<ReturnType<typeof buscarEmpresaFiscalPorEmpresa>>
	>;
	nfceConfiguracao: NonNullable<
		Awaited<ReturnType<typeof buscarNfceConfiguracaoPorEmpresa>>
	>;
	certificadoAtivo: NonNullable<
		Awaited<ReturnType<typeof buscarCertificadoAtivoPorEmpresa>>
	>;
	numeroNf: number;
	serie: string;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
	pagamento?: PagamentoPayloadNfe;
	natOp?: string;
	informacoesAdicionais?: string;
}) {
	const configJson = montarConfigJsonSpedNfce({
		empresa,
		empresaFiscal,
		nfceConfiguracao,
	});
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);
	const verProc = nfceConfiguracao.verproc ?? "MaisGestao 1.0.0";

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
				mod: 65,
				tpImp: 4,
				serie: Number(serie),
				nNF: numeroNf,
				dhEmi: agoraBrasiliaIsoOffset(),
				tpAmb: nfceConfiguracao.ambiente,
				verProc,
				idDest: 1,
				indFinal: 1,
				indPres: 1,
				finNFe: 1,
				tpNF: 1,
			},
			destinatario: {},
			itens,
			totais: totais ?? {},
			pagamento: pagamento ?? {},
			transporte: { modFrete: 9 },
			informacoesAdicionais: informacoesAdicionais ?? "",
		},
	};
}
