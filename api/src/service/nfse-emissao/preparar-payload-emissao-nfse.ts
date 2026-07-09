import { NFSE_AMBIENTE } from "@/constants/nfse-emissao.js";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	ItemPayloadNfse,
	PayloadNfse,
	ServicoPayloadNfse,
	TomadorPayloadNfse,
} from "@/model/nfse-emissao-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarNfseSeriePorId,
	reservarProximoNumeroSerieNfse,
} from "@/repositories/nfse-serie-repositories.js";
import { carregarContextoEmissaoNfse } from "@/service/nfse-emissao/contexto-emissao-nfse.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import {
	descriptografarCredenciaisCertificado,
	montarConfigJsonNfseGateway,
} from "@/util/montar-config-nfse.js";

export type PrepararPayloadEmissaoNfseParams = {
	idusuario: string;
	idempresa: string;
	iddestinatario?: string;
	idnfseserie?: string;
	confirmarProducao?: boolean;
	tomador?: TomadorPayloadNfse;
	servico: Omit<ServicoPayloadNfse, "valores"> & {
		valores: ServicoPayloadNfse["valores"];
	};
	itens?: ItemPayloadNfse[];
	competencia?: string;
	dataEmissao?: string;
	informacoesAdicionais?: string;
	idordemservico?: string;
	idplanocontas?: string;
	idcondicaopagto?: string;
	idtipodocumento?: string;
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
};

export type PayloadEmissaoNfsePreparado = {
	payloadGateway: {
		configJson: Record<string, unknown>;
		pfxBase64: string;
		senha: string;
		payloadNfse: PayloadNfse;
	};
	numeroRps: number;
	serie: string;
	idserie: string;
	ambiente: number;
	valorTotal: number;
	destinatario?: TomadorPayloadNfse;
	dadosSalvos: {
		idordemservico?: string;
		gerarFinanceiro?: boolean;
		idplanocontas?: string;
		idcondicaopagto?: string;
		idtipodocumento?: string;
		formasPagamento?: FormaPagamentoNfVenda[];
	};
};

export async function prepararPayloadEmissaoNfse(
	params: PrepararPayloadEmissaoNfseParams,
): Promise<HttpResponse<PayloadEmissaoNfsePreparado>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contexto = await carregarContextoEmissaoNfse(params.idempresa);

	if (contexto.pendencias.length > 0) {
		return httpBadRequest(
			contexto.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const { empresa, empresaFiscal, nfseConfiguracao, certificadoAtivo } =
		contexto;

	if (!empresa || !empresaFiscal || !nfseConfiguracao || !certificadoAtivo) {
		return httpBadRequest("Contexto NFS-e incompleto");
	}

	if (
		nfseConfiguracao.ambiente === NFSE_AMBIENTE.PRODUCAO &&
		!params.confirmarProducao
	) {
		return httpBadRequest(
			"Confirme a emissão em ambiente de produção (confirmarProducao=true)",
		);
	}

	let serieRegistro = contexto.seriePadrao;
	if (params.idnfseserie) {
		serieRegistro = await buscarNfseSeriePorId(params.idnfseserie);
	}

	if (!serieRegistro) {
		return httpBadRequest("Série RPS não encontrada");
	}

	const reserva = await reservarProximoNumeroSerieNfse(serieRegistro.id);
	if (!reserva) {
		return httpBadRequest("Falha ao reservar número RPS");
	}

	let tomador = params.tomador;
	if (params.iddestinatario) {
		const entidade = await buscarEntidadePorId(params.iddestinatario);
		if (!entidade) {
			return httpBadRequest("Tomador não encontrado");
		}
		tomador = {
			cnpjCpf: entidade.cnpjcpf ?? undefined,
			razaoSocial: entidade.razaosocial ?? entidade.nome ?? undefined,
			email: entidade.email ?? undefined,
			endereco: {
				logradouro: entidade.endereco ?? undefined,
				numero: entidade.numeroendereco ?? undefined,
				complemento: entidade.complemento ?? undefined,
				bairro: entidade.bairro ?? undefined,
				codigoMunicipioIbge: entidade.idcidade ?? undefined,
				uf: entidade.idestado ?? undefined,
				cep: entidade.cep ?? undefined,
			},
		};
	}

	if (!tomador?.cnpjCpf || !tomador.razaoSocial) {
		return httpBadRequest("Tomador com CPF/CNPJ e razão social é obrigatório");
	}

	if (!params.servico.itemListaServico) {
		return httpBadRequest("Item da lista de serviço (LC 116) é obrigatório");
	}

	const hoje = new Date().toISOString().slice(0, 10);
	const dataEmissao = params.dataEmissao ?? hoje;
	const competencia = params.competencia ?? hoje;

	const valorServicos =
		params.servico.valores.servicos ??
		(params.itens ?? []).reduce(
			(acc, item) => acc + item.quantidade * item.valorUnitario,
			0,
		);

	const payloadNfse: PayloadNfse = {
		prestador: {
			cnpj: empresa.cnpj.replace(/\D/g, ""),
			im: empresaFiscal.inscricaomunicipal?.replace(/\D/g, "") ?? "",
			municipioIbge:
				nfseConfiguracao.codigomunicipioibge ??
				empresaFiscal.codigomunicipioibge ??
				"",
			razaoSocial: empresaFiscal.razaosocial ?? undefined,
			optanteSimplesNacional:
				empresaFiscal.crt === 1 || empresaFiscal.crt === 2 ? "1" : "2",
			incentivoFiscal: "2",
		},
		tomador: tomador!,
		rps: {
			numero: reserva.numeroRps,
			serie: reserva.serie,
			tipo: "1",
			dataEmissao,
			competencia,
		},
		servico: {
			...params.servico,
			valores: {
				...params.servico.valores,
				servicos: valorServicos,
			},
			codigoMunicipioIncidencia:
				params.servico.codigoMunicipioIncidencia ??
				nfseConfiguracao.codigomunicipioibge ??
				empresaFiscal.codigomunicipioibge ??
				"",
			exigibilidadeIss: params.servico.exigibilidadeIss ?? "1",
			issRetido: params.servico.issRetido ?? "2",
		},
		itens: params.itens,
	};

	const configJson = montarConfigJsonNfseGateway({
		empresa,
		empresaFiscal,
		nfseConfiguracao,
	});
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);

	return httpOk<PayloadEmissaoNfsePreparado>({
		payloadGateway: {
			configJson,
			pfxBase64: credenciais.pfxBase64,
			senha: credenciais.senha,
			payloadNfse,
		},
		numeroRps: reserva.numeroRps,
		serie: reserva.serie,
		idserie: reserva.idserie,
		ambiente: nfseConfiguracao.ambiente,
		valorTotal: valorServicos,
		destinatario: tomador,
		dadosSalvos: {
			idordemservico: params.idordemservico,
			gerarFinanceiro: params.gerarFinanceiro ?? true,
			idplanocontas: params.idplanocontas,
			idcondicaopagto: params.idcondicaopagto,
			idtipodocumento: params.idtipodocumento,
			formasPagamento: params.formasPagamento,
		},
	});
}
