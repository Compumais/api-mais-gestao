import { v4 as uuidv4 } from "uuid";
import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { emitirNfseGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosEmissaoNfseSalvos,
	ItemPayloadNfse,
} from "@/model/nfse-emissao-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { integrarNfseAutorizadaService } from "@/service/nfse-emissao/integrar-nfse-autorizada.js";
import {
	type PrepararPayloadEmissaoNfseParams,
	prepararPayloadEmissaoNfse,
} from "@/service/nfse-emissao/preparar-payload-emissao-nfse.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { httpOk } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

export type EmitirNfseParametros = PrepararPayloadEmissaoNfseParams;

export type ResultadoEmissaoNfse = {
	idnotafiscal: string;
	numeroRps: number;
	serie: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	protocolo?: string | null;
	ambiente?: number;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	erros?: Array<{ codigo: string; mensagem: string }>;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		avisos: string[];
	};
};

function montarItensPersistencia(
	idnotafiscal: string,
	itens: ItemPayloadNfse[] | undefined,
	servicoDescricao: string,
	valorTotal: number,
	itemLista: string,
): NovoNotaFiscalItem[] {
	if (itens && itens.length > 0) {
		return itens.map((item, index) => ({
			id: uuidv4(),
			idnotafiscal,
			descricao: item.descricao,
			quantidade: String(item.quantidade),
			precounitario: String(item.valorUnitario),
			total: String(item.quantidade * item.valorUnitario),
			contador: index + 1,
			tipo: "S",
			codigolistalc11603: item.codigoListaLc11603 ?? itemLista,
			currenttimemillis: Date.now(),
		}));
	}

	return [
		{
			id: uuidv4(),
			idnotafiscal,
			descricao: servicoDescricao,
			quantidade: "1",
			precounitario: String(valorTotal),
			total: String(valorTotal),
			contador: 1,
			tipo: "S",
			codigolistalc11603: itemLista,
			currenttimemillis: Date.now(),
		},
	];
}

export async function emitirNfseService(
	params: EmitirNfseParametros,
): Promise<HttpResponse<ResultadoEmissaoNfse>> {
	const preparado = await prepararPayloadEmissaoNfse(params);

	if (!preparado.success || !preparado.body) {
		return preparado as HttpResponse<ResultadoEmissaoNfse>;
	}

	const {
		payloadGateway,
		numeroRps,
		serie,
		ambiente,
		valorTotal,
		destinatario,
		dadosSalvos,
	} = preparado.body;

	const resposta = await emitirNfseGateway(payloadGateway);
	const agora = new Date().toISOString();
	const idnotafiscal = uuidv4();

	const autorizada = resposta.sucesso === true;
	const status = autorizada ? NFE_STATUS.AUTORIZADA : NFE_STATUS.REJEITADA;

	const dadosImportacao: DadosEmissaoNfseSalvos = {
		...dadosSalvos,
		payload: payloadGateway.payloadNfse,
	};

	const nota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa: params.idempresa,
		idusuarioinclusao: params.idusuario,
		identidade: params.iddestinatario ?? null,
		modelo: MODELO_NFSE,
		tipoorigem: TIPO_ORIGEM_NFSE,
		serie,
		numero: String(numeroRps),
		numeronotafiscal: String(numeroRps),
		numeronfse: resposta.numeroNfse ?? null,
		codigoautenticidadenfse: resposta.codigoVerificacao ?? null,
		linknfse: resposta.link ?? null,
		pendenciarps: autorizada ? 0 : 1,
		status,
		tipoambientenfe: ambiente,
		emissao: agora,
		datahoraemissao: agora,
		datainclusao: agora,
		currenttimemillis: Date.now(),
		valortotalnota: String(valorTotal),
		baseiss: String(payloadGateway.payloadNfse.servico.valores.servicos),
		iss: String(payloadGateway.payloadNfse.servico.valores.iss ?? 0),
		cnpjcpf: destinatario?.cnpjCpf ?? null,
		razaosocial: destinatario?.razaoSocial ?? null,
		dadosimportacao: dadosImportacao as unknown as Record<string, unknown>,
		mensagemtransmissaonfe: autorizada
			? null
			: (resposta.erro ??
				resposta.erros?.map((e) => e.mensagem).join("; ") ??
				"Emissão NFS-e rejeitada"),
	};

	const itens = montarItensPersistencia(
		idnotafiscal,
		params.itens,
		params.servico.discriminacao,
		valorTotal,
		params.servico.itemListaServico,
	);

	await criarNotaFiscalComItens(nota, itens);

	if (resposta.xmlEnviado || resposta.xml) {
		await arquivarXmlNotaFiscal({
			idempresa: params.idempresa,
			idnotafiscal,
			tipo: autorizada ? "autorizado" : "assinado",
			xml: resposta.xml ?? resposta.xmlEnviado ?? "",
		});
	}

	let integracao: ResultadoEmissaoNfse["integracao"];
	if (autorizada && (dadosSalvos.gerarFinanceiro ?? true)) {
		const resultadoIntegracao = await integrarNfseAutorizadaService({
			idusuario: params.idusuario,
			idnotafiscal,
			gerarFinanceiro: true,
		});
		if (resultadoIntegracao.success && resultadoIntegracao.body) {
			integracao = {
				parcelasGeradas: resultadoIntegracao.body.parcelasGeradas,
				lancamentosCaixa: resultadoIntegracao.body.lancamentosCaixa,
				avisos: resultadoIntegracao.body.avisos,
			};
		}
	}

	return httpOk<ResultadoEmissaoNfse>({
		idnotafiscal,
		numeroRps,
		serie,
		numeroNfse: resposta.numeroNfse,
		codigoVerificacao: resposta.codigoVerificacao,
		link: resposta.link,
		protocolo: resposta.protocolo,
		ambiente,
		erros: resposta.erros,
		integracao,
	});
}
