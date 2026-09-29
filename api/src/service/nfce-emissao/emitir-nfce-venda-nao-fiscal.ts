import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { listarItensPorVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { complementarBaixaFiscalVendaPdv } from "@/service/estoque/complementar-baixa-fiscal-venda-pdv.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { isAmbienteHomologacao } from "@/util/ambiente-sefaz.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

export type EmitirNfceVendaNaoFiscalParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	/** Quando true, pula verificação de pertença (já feita no lote). */
	pularVerificacaoUsuario?: boolean;
};

export type ResultadoEmitirNfceVendaNaoFiscal = ResultadoEmissaoNfcePdv & {
	jaEmitida?: boolean;
	avisosEstoque?: string[];
};

export type ElegibilidadeEmitirNfceVendaNaoFiscal =
	| { ok: true; jaAutorizada: boolean }
	| { ok: false; motivo: string; ignorar: boolean };

/**
 * Avalia se a venda pode receber emissão NFC-e a partir da retaguarda
 * (conversão de não fiscal ou reemissão de tentativa falha).
 */
export function avaliarElegibilidadeEmitirNfceVendaNaoFiscal(params: {
	venda: {
		idempresa: string;
		cancelada?: boolean | null;
		idnotafiscalnfce?: string | null;
	};
	idempresa: string;
	statusNota: number | null | undefined;
}): ElegibilidadeEmitirNfceVendaNaoFiscal {
	if (params.venda.idempresa !== params.idempresa) {
		return { ok: false, motivo: "Venda não pertence à empresa", ignorar: true };
	}
	if (params.venda.cancelada) {
		return { ok: false, motivo: "Venda cancelada", ignorar: true };
	}
	if (params.statusNota === NFE_STATUS.AUTORIZADA) {
		return { ok: true, jaAutorizada: true };
	}
	if (
		params.statusNota === NFE_STATUS.CANCELADA ||
		params.statusNota === NFE_STATUS.CANCELADA_FORA_PRAZO
	) {
		return {
			ok: false,
			motivo: "NFC-e da venda está cancelada",
			ignorar: true,
		};
	}
	return { ok: true, jaAutorizada: false };
}

async function complementarEstoqueAposAutorizacao(params: {
	idempresa: string;
	idvenda: string;
	idusuario: string;
	homologacao: boolean;
}): Promise<string[]> {
	if (params.homologacao) {
		return ["NFC-e autorizada em homologação: baixa fiscal não aplicada."];
	}

	const itensVenda = await listarItensPorVendaPdv(params.idvenda);
	const itens = itensVenda.map((item) => ({
		idproduto: item.idproduto,
		quantidade: String(item.quantidade),
		precounitario: String(item.precounitario),
		...(item.descricao ? { nomeproduto: item.descricao } : {}),
	}));

	if (itens.length === 0) {
		return ["NFC-e autorizada, mas a venda não possui itens para baixa fiscal."];
	}

	const complemento = await complementarBaixaFiscalVendaPdv({
		idempresa: params.idempresa,
		idvenda: params.idvenda,
		itens,
		idusuario: params.idusuario,
	});

	return complemento.avisos;
}

/**
 * Emite NFC-e de uma venda PDV não fiscal (ou reemite tentativa falha)
 * e complementa a baixa fiscal quando autorizada em produção.
 */
export async function emitirNfceVendaNaoFiscalService({
	idusuario,
	idempresa,
	idvenda,
	pularVerificacaoUsuario = false,
}: EmitirNfceVendaNaoFiscalParametros): Promise<
	HttpResponse<ResultadoEmitirNfceVendaNaoFiscal>
> {
	if (!pularVerificacaoUsuario) {
		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);
		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}
	}

	const venda = await buscarVendaPdvGourmetPorId(idvenda);
	if (!venda || venda.idempresa !== idempresa) {
		return httpNaoEncontrado("Venda não encontrada");
	}

	const notaExistente = venda.idnotafiscalnfce
		? await buscarNotaFiscalPorId(venda.idnotafiscalnfce)
		: null;

	const elegibilidade = avaliarElegibilidadeEmitirNfceVendaNaoFiscal({
		venda,
		idempresa,
		statusNota: notaExistente?.status ?? null,
	});

	if (!elegibilidade.ok) {
		return httpBadRequest(elegibilidade.motivo);
	}

	if (elegibilidade.jaAutorizada) {
		const resultado: ResultadoEmitirNfceVendaNaoFiscal = {
			emitida: true,
			jaEmitida: true,
		};
		if (notaExistente?.id) resultado.idnotafiscal = notaExistente.id;
		if (notaExistente?.chavenfe) resultado.chave = notaExistente.chavenfe;
		if (notaExistente?.protocolonfe) {
			resultado.protocolo = notaExistente.protocolonfe;
		}
		if (notaExistente?.serie) resultado.serie = notaExistente.serie;
		const numero = Number(notaExistente?.numeronotafiscal);
		if (Number.isFinite(numero) && numero > 0) resultado.numero = numero;
		return httpOk(resultado);
	}

	const emissao = await emitirNfceVendaPdvService({
		idusuario,
		idempresa,
		idvenda,
	});

	if (!emissao.success) {
		return emissao as HttpResponse<ResultadoEmitirNfceVendaNaoFiscal>;
	}

	const body = emissao.body ?? { emitida: false };
	const resultado: ResultadoEmitirNfceVendaNaoFiscal = { ...body };

	if (body.emitida) {
		const nfceConfig = await buscarNfceConfiguracaoPorEmpresa(idempresa);
		const avisos = await complementarEstoqueAposAutorizacao({
			idempresa,
			idvenda,
			idusuario,
			homologacao: isAmbienteHomologacao(nfceConfig?.ambiente),
		});
		if (avisos.length > 0) {
			resultado.avisosEstoque = avisos;
		}
	}

	return httpOk(resultado);
}
