import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalNfcePorSerieNumero,
	criarNotaFiscalComItens,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	inutilizarNfeVendaService,
	type ResultadoInutilizacaoNfe,
} from "@/service/nfe-emissao/inutilizar-nfe-venda.js";
import { resolverAmbienteSefaz } from "@/util/ambiente-sefaz.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

type RegistrarInutilizacaoNumeracaoNfceParametros = {
	idusuario: string;
	idempresa: string;
	serie: number;
	numero: number;
	justificativa: string;
	/** Se informado, desvincula a venda da nota inutilizada após sucesso. */
	idvenda?: string;
};

/**
 * Garante registro de numeração NFC-e inutilizada na retaguarda (status 102),
 * criando stub pendente quando a faixa ainda não existir e chamando a SEFAZ.
 * Usado quando o PDV abandona um nNF (ex.: reemissão por conflito de numeração).
 */
export async function registrarInutilizacaoNumeracaoNfceService({
	idusuario,
	idempresa,
	serie,
	numero,
	justificativa,
	idvenda,
}: RegistrarInutilizacaoNumeracaoNfceParametros): Promise<
	HttpResponse<ResultadoInutilizacaoNfe>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!Number.isInteger(serie) || serie < 1) {
		return httpBadRequest("Série inválida para inutilização");
	}
	if (!Number.isInteger(numero) || numero < 1) {
		return httpBadRequest("Número inválido para inutilização");
	}

	const serieStr = String(serie);
	const numeroStr = String(numero);
	const nfceConfig = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const ambiente = resolverAmbienteSefaz(nfceConfig?.ambiente);

	let nota = await buscarNotaFiscalNfcePorSerieNumero(
		idempresa,
		serieStr,
		numeroStr,
		ambiente,
	);

	if (!nota) {
		nota = await buscarNotaFiscalNfcePorSerieNumero(
			idempresa,
			serieStr,
			numeroStr,
		);
	}

	if (nota?.status === NFE_STATUS.INUTILIZADA) {
		return httpOk({
			idnotafiscal: nota.id,
			status: NFE_STATUS.INUTILIZADA,
			cStat: String(nota.codigostatusprotocolonfe ?? 102),
			xMotivo: nota.mensagemprotocolonfe ?? "Numeração já inutilizada",
			...(nota.protocolonfe ? { protocolo: nota.protocolonfe } : {}),
		});
	}

	if (nota?.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest(
			`NFC-e série ${serie} número ${numero} já está autorizada — não pode ser inutilizada`,
		);
	}

	if (
		nota?.status === NFE_STATUS.CANCELADA ||
		nota?.status === NFE_STATUS.CANCELADA_FORA_PRAZO
	) {
		return httpBadRequest(
			`NFC-e série ${serie} número ${numero} já está cancelada — não há numeração a inutilizar`,
		);
	}

	let idnotafiscal = nota?.id;
	if (!idnotafiscal) {
		const agora = agoraBrasiliaIsoOffset();
		idnotafiscal = uuidv4();
		const dadosNota: NovaNotaFiscal = {
			id: idnotafiscal,
			idempresa,
			idusuarioinclusao: idusuario,
			datainclusao: agora,
			emissao: hojeBrasiliaIsoDate(),
			datahoraemissao: agora,
			currenttimemillis: Date.now(),
			modelo: "65",
			serie: serieStr,
			numeronotafiscal: numeroStr,
			tipoambientenfe: ambiente,
			tipoorigem: 1,
			status: NFE_STATUS.PENDENTE,
			finalidadeemissaonfe: 1,
			tipofrete: 9,
			mensagemtransmissaonfe:
				"Stub de numeração abandonada no PDV — aguardando inutilização SEFAZ",
			dadosimportacao: {
				origem: "pdv-hibrido-inutilizacao-numeracao",
				serie,
				numero,
				...(idvenda ? { idvenda } : {}),
			},
		};
		await criarNotaFiscalComItens(dadosNota, []);
	}

	const resultado = await inutilizarNfeVendaService({
		idusuario,
		idnotafiscal,
		justificativa,
		permitirNfce: true,
	});

	if (!resultado.success || !resultado.body) {
		return resultado;
	}

	const vendaVinculada =
		await buscarVendaPdvGourmetPorNotaFiscalNfce(idnotafiscal);
	if (
		vendaVinculada &&
		(!idvenda || vendaVinculada.id === idvenda)
	) {
		await atualizarVendaPdvGourmet(vendaVinculada.id, {
			idnotafiscalnfce: null,
		});
	}

	// Garante série/número/ambiente para listagem em /nfce
	await atualizarNotaFiscal(resultado.body.idnotafiscal, {
		serie: serieStr,
		numeronotafiscal: numeroStr,
		tipoambientenfe: ambiente,
	}).catch(() => undefined);

	return resultado;
}
