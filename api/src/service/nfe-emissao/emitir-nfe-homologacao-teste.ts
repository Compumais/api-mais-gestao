import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { emitirNfeHomologacaoGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import {
	carregarContextoEmissaoNfe,
	montarPayloadGatewayEmissao,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { reservarProximoNumeroSerie } from "@/repositories/nfe-serie-repositories.js";
import { httpBadRequest, httpErro, httpOk, httpProibido } from "@/util/http-util.js";

const TIPO_ORIGEM_EMISSAO_VENDA = 1;
const STATUS_AUTORIZADA = 100;
const STATUS_REJEITADA = 110;

type Parametros = {
	idempresa: string;
	idusuario: string;
};

export async function emitirNfeHomologacaoTesteService({
	idempresa,
	idusuario,
}: Parametros): Promise<
	HttpResponse<{
		idnotafiscal?: string;
		chave?: string;
		protocolo?: string;
		cStat?: string;
		xMotivo?: string;
		pendencias?: Array<{ codigo: string; mensagem: string }>;
	}>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contexto = await carregarContextoEmissaoNfe(idempresa);

	if (contexto.pendencias.length > 0) {
		return httpOk({ pendencias: contexto.pendencias });
	}

	if (contexto.nfeConfiguracao?.ambiente !== 2) {
		return httpBadRequest(
			"Emissão de teste disponível apenas em ambiente de homologação",
		);
	}

	const reserva = await reservarProximoNumeroSerie(contexto.seriePadrao!.id);
	if (!reserva) {
		return httpBadRequest("Não foi possível reservar numeração da série");
	}

	const payload = await montarPayloadGatewayEmissao({
		empresa: contexto.empresa!,
		empresaFiscal: contexto.empresaFiscal!,
		nfeConfiguracao: contexto.nfeConfiguracao!,
		certificadoAtivo: contexto.certificadoAtivo!,
		numeroNf: reserva.numeroReservado,
		serie: reserva.serie,
	});

	const resposta = await emitirNfeHomologacaoGateway(payload);

	const autorizada = resposta.cStat === "100" || !!resposta.protocolo;
	const agora = new Date().toISOString();
	const idnotafiscal = uuidv4();

	const { notaFiscal } = await criarNotaFiscalComItens(
		{
			id: idnotafiscal,
			idempresa,
			idusuarioinclusao: idusuario,
			datainclusao: agora,
			currenttimemillis: Date.now(),
			modelo: "55",
			serie: reserva.serie,
			numeronotafiscal: String(reserva.numeroReservado),
			chavenfe: resposta.chave ?? null,
			protocolonfe: resposta.protocolo ?? null,
			tipoambientenfe: contexto.nfeConfiguracao!.ambiente,
			tipoorigem: TIPO_ORIGEM_EMISSAO_VENDA,
			status: autorizada ? STATUS_AUTORIZADA : STATUS_REJEITADA,
			razaosocial: contexto.empresaFiscal!.razaosocial,
			valortotalnota: "1.00",
			totalproduto: "1.00",
			arquivoxmlassinado: resposta.xmlEnviado ?? null,
			arquivoxmlautorizada: autorizada ? resposta.xmlRetorno ?? null : null,
			mensagemtransmissaonfe: resposta.xMotivo ?? null,
			codigostatusprotocolonfe: resposta.cStat ? Number(resposta.cStat) : null,
		},
		[
			{
				id: uuidv4(),
				idnotafiscal,
				descricao:
					"NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
				quantidade: "1",
				precounitario: "1",
				total: "1",
				cfop: "5102",
				ncm: "61091000",
				unidade: "UN",
				contador: 1,
				tipo: "P",
				currenttimemillis: Date.now(),
			},
		],
	);

	if (resposta.xmlEnviado && notaFiscal) {
		await arquivarXmlNotaFiscal({
			idnotafiscal: notaFiscal.id,
			idempresa,
			xml: resposta.xmlEnviado,
			chavenfe: resposta.chave,
		});
	}

	if (autorizada && resposta.xmlRetorno && notaFiscal) {
		await arquivarXmlNotaFiscal({
			idnotafiscal: notaFiscal.id,
			idempresa,
			xml: resposta.xmlRetorno,
			chavenfe: resposta.chave,
			protocolonfe: resposta.protocolo,
		});
	}

	if (!resposta.sucesso) {
		const corpoErro: {
			idnotafiscal: string;
			chave?: string;
			protocolo?: string;
			cStat?: string;
			xMotivo?: string;
		} = { idnotafiscal };
		if (resposta.chave) corpoErro.chave = resposta.chave;
		if (resposta.protocolo) corpoErro.protocolo = resposta.protocolo;
		if (resposta.cStat) corpoErro.cStat = resposta.cStat;
		const motivo = resposta.erro ?? resposta.xMotivo;
		if (motivo) corpoErro.xMotivo = motivo;
		return httpOk(corpoErro);
	}

	const corpoOk: {
		idnotafiscal: string;
		chave?: string;
		protocolo?: string;
		cStat?: string;
		xMotivo?: string;
	} = { idnotafiscal };
	if (resposta.chave) corpoOk.chave = resposta.chave;
	if (resposta.protocolo) corpoOk.protocolo = resposta.protocolo;
	if (resposta.cStat) corpoOk.cStat = resposta.cStat;
	if (resposta.xMotivo) corpoOk.xMotivo = resposta.xMotivo;

	return httpOk(corpoOk);
}
