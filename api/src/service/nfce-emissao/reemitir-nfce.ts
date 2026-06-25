import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarVendaPdvGourmetPorId,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type ReemitirNfceParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
};

const STATUS_REEMISSAO_NFCE = new Set<number>([
	NFE_STATUS.PENDENTE,
	NFE_STATUS.REJEITADA,
	NFE_STATUS.DENEGADA,
]);

function extrairIdVendaDadosImportacao(dados: unknown): string | null {
	if (!dados || typeof dados !== "object") return null;
	const idvenda = (dados as { idvenda?: unknown }).idvenda;
	return typeof idvenda === "string" ? idvenda : null;
}

export async function reemitirNfceService({
	idusuario,
	idempresa,
	idnotafiscal,
}: ReemitirNfceParametros): Promise<HttpResponse<ResultadoEmissaoNfcePdv>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (nota.modelo !== "65") {
		return httpBadRequest("Somente NFC-e (modelo 65) podem ser reemitidas");
	}

	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("NFC-e já autorizada não pode ser reemitida");
	}

	if (nota.status == null || !STATUS_REEMISSAO_NFCE.has(nota.status)) {
		return httpBadRequest(
			"Somente NFC-e pendentes, rejeitadas ou denegadas podem ser reemitidas",
		);
	}

	let venda = await buscarVendaPdvGourmetPorNotaFiscalNfce(idnotafiscal);
	if (!venda) {
		const idvenda = extrairIdVendaDadosImportacao(nota.dadosimportacao);
		if (idvenda) {
			venda = await buscarVendaPdvGourmetPorId(idvenda);
		}
	}

	if (!venda || venda.idempresa !== idempresa) {
		return httpBadRequest(
			"Não foi possível localizar a venda PDV vinculada a esta NFC-e",
		);
	}

	return emitirNfceVendaPdvService({
		idusuario,
		idempresa,
		idvenda: venda.id,
		pagamentos: {
			valordinheiro: venda.valordinheiro,
			valorcartao: venda.valorcartao,
			valorpix: venda.valorpix,
			valorprepago: venda.valorprepago,
			valortroco: venda.valortroco,
			valortotal: venda.valortotal,
		},
	});
}
