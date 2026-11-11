
import {
	NFSE_SEFIN_SERIE_MAX,
	NFSE_SEFIN_SERIE_MIN,
} from "@/constants/nfse-emissao.js";


import type { Empresa } from "@/model/empresa-model.js";
import type { CertificadoDigital } from "@/model/nfe-emissao-model.js";
import type { NfseConfiguracao } from "@/model/nfse-emissao-model.js";
import type { EmpresaFiscal } from "@/repositories/empresa-fiscal-repositories.js";
import type { NfseSerie } from "@/repositories/nfse-serie-repositories.js";

export type PendenciaNfse = {
	codigo: string;
	mensagem: string;
};

export function isProvedorSefinNacional(provedor?: string | null): boolean {
	const p = (provedor ?? "").toLowerCase().trim();
	return p === "sefin_nacional" || p === "sefin-nacional" || p === "adn";
}

export function isLayoutNfseDps(
	versaolayout?: string | null,
	provedor?: string | null,
): boolean {
	if (isProvedorSefinNacional(provedor)) {
		return true;
	}
	const v = (versaolayout ?? "").toLowerCase();
	return v.includes("dps") || v.includes("nacional");
}

export function formatarMensagemErroGatewayNfse(
	resposta: {
		erro?: string | null;
		erros?: Array<{ codigo?: string | null; mensagem?: string | null }> | null;
	},
	mensagemFallback: string,
): string {
	const listaErros = (resposta.erros ?? [])
		.map((item) => {
			const codigo = (item.codigo ?? "").trim();
			const mensagem = (item.mensagem ?? "").trim();
			if (!mensagem) {
				return "";
			}
			if (
				codigo &&
				codigo !== "SEFIN" &&
				!mensagem.includes(`[${codigo}]`) &&
				!mensagem.startsWith(`${codigo}:`) &&
				!mensagem.startsWith(`${codigo} `)
			) {
				return `[${codigo}] ${mensagem}`;
			}
			return mensagem;
		})
		.filter(Boolean);

	if (listaErros.length > 0) {
		return listaErros.join("; ");
	}

	const erroSimples = (resposta.erro ?? "").trim();
	if (erroSimples) {
		return erroSimples;
	}

	return mensagemFallback;
}

function urlPareceDps(url?: string | null): boolean {
	const u = (url ?? "").toLowerCase();
	return (
		u.includes("/dps/") ||
		(u.includes("nota-eletronica.betha.cloud") && u.includes("service.wsdl"))
	);
}

export function validarPreRequisitosEmissaoNfse({
	empresa,
	empresaFiscal,
	nfseConfiguracao,
	certificadoAtivo,
	seriePadrao,
}: {
	empresa: Empresa;
	empresaFiscal?: EmpresaFiscal | null;
	nfseConfiguracao?: NfseConfiguracao | null;
	certificadoAtivo?: CertificadoDigital | null;
	seriePadrao?: NfseSerie | null;
}): PendenciaNfse[] {
	const pendencias: PendenciaNfse[] = [];

	if (!empresa.cnpj) {
		pendencias.push({
			codigo: "CNPJ_EMPRESA",
			mensagem: "CNPJ da empresa não cadastrado",
		});
	}

	if (!empresaFiscal) {
		pendencias.push({
			codigo: "EMPRESA_FISCAL",
			mensagem: "Cadastro fiscal da empresa incompleto",
		});
	} else {
		if (!empresaFiscal.inscricaomunicipal) {
			pendencias.push({
				codigo: "IM_PRESTADOR",
				mensagem: "Inscrição municipal do prestador não cadastrada",
			});
		}
		if (!empresaFiscal.codigomunicipioibge) {
			pendencias.push({
				codigo: "MUNICIPIO_IBGE",
				mensagem:
					"Código IBGE do município não cadastrado no fiscal da empresa",
			});
		}
	}

	if (!nfseConfiguracao) {
		pendencias.push({
			codigo: "NFSE_CONFIG",
			mensagem: "Configuração NFS-e não encontrada",
		});
	} else {
		const urlsOperacao = nfseConfiguracao.urlsoperacao;
		const temUrlBase = Boolean(nfseConfiguracao.urlwsdl?.trim());
		const temUrlConsulta = Boolean(urlsOperacao?.consulta?.trim());
		const temUrlEmissao = Boolean(urlsOperacao?.emissao?.trim());
		const provedor = String(nfseConfiguracao.provedor ?? "").toLowerCase();
		const sefin = isProvedorSefinNacional(provedor);
		const modoDps = isLayoutNfseDps(nfseConfiguracao.versaolayout, provedor);
		const urlDps =
			urlPareceDps(nfseConfiguracao.urlwsdl) ||
			urlPareceDps(urlsOperacao?.emissao);

		if (sefin) {
			// Sefin Nacional: URL por ambiente no gateway; WSDL SOAP não é exigido.
		} else if (provedor === "betha" && modoDps) {
			if (!temUrlBase && !temUrlEmissao) {
				pendencias.push({
					codigo: "NFSE_WSDL_DPS",
					mensagem:
						"Betha DPS: informe a URL/WSDL da Nota Nacional (ex.: nota-eletronica.betha.cloud/dps/ws/service.wsdl)",
				});
			} else if (!urlDps && temUrlBase) {
				pendencias.push({
					codigo: "NFSE_WSDL_DPS_INVALIDO",
					mensagem:
						"Betha DPS: a URL configurada não parece ser o WSDL DPS (/dps/ws/service.wsdl)",
				});
			}
		} else {
			if (!temUrlBase && !temUrlEmissao && !temUrlConsulta) {
				pendencias.push({
					codigo: "NFSE_WSDL",
					mensagem: "URL/WSDL do provedor NFS-e não configurada",
				});
			}

			if (provedor === "betha" && !temUrlBase && !temUrlConsulta) {
				pendencias.push({
					codigo: "NFSE_WSDL_CONSULTA",
					mensagem:
						"Betha: informe a URL/WSDL base ou a URL de consulta (consultarNfsePorRps?wsdl)",
				});
			}
		}
	}

	if (!certificadoAtivo) {
		pendencias.push({
			codigo: "CERTIFICADO",
			mensagem: "Certificado digital A1 ativo não encontrado",
		});
	}

	if (!seriePadrao) {
		pendencias.push({
			codigo: "SERIE_RPS",
			mensagem: "Série RPS padrão não configurada",
		});
	} else if (isProvedorSefinNacional(nfseConfiguracao?.provedor)) {
		const serieNum = Number.parseInt(
			String(seriePadrao.serie).replace(/\D/g, "") || "0",
			10,
		);
		if (
			!Number.isFinite(serieNum) ||
			serieNum < NFSE_SEFIN_SERIE_MIN ||
			serieNum > NFSE_SEFIN_SERIE_MAX
		) {
			pendencias.push({
				codigo: "SERIE_SEFIN_FAIXA",
				mensagem: `Série DPS Sefin Nacional deve estar entre ${NFSE_SEFIN_SERIE_MIN} e ${NFSE_SEFIN_SERIE_MAX} (aplicativos próprios / API)`,
			});
		}
	}

	return pendencias;
}
