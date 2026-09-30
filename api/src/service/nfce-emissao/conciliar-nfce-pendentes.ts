import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	listarNfceAguardandoConciliacao,
} from "@/repositories/nota-fiscal-repositories.js";
import { executarComLockEmissaoNfce } from "@/repositories/reconciliacao-nfce-pdv-repositories.js";
import { buscarVendaPdvGourmetPorNotaFiscalNfce } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { conciliarNfceDocumento } from "@/service/nfce-emissao/conciliar-nfce-documento.js";
import type { ResultadoEmissaoNfcePdv } from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

export type ResumoConciliacaoNfcePendentes = {
	analisadas: number;
	recuperadas: number;
	conflitos: number;
	aguardando: number;
	ignoradas: number;
};

async function conciliarNotaBloqueando(params: {
	idnotafiscal: string;
	idempresa: string;
	idusuario?: string | null;
	motivo: string;
}): Promise<"recuperada" | "conflito" | "aguardando" | "ignorada"> {
	const nota = await buscarNotaFiscalPorId(params.idnotafiscal);
	if (!nota || nota.idempresa !== params.idempresa || nota.modelo !== "65") {
		return "ignorada";
	}
	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return "recuperada";
	}

	const venda = await buscarVendaPdvGourmetPorNotaFiscalNfce(nota.id);
	const idLock = venda?.id ?? `nota:${nota.id}`;
	const lock = await executarComLockEmissaoNfce(nota.idempresa, idLock, () =>
		conciliarNfceDocumento({
			nota,
			idusuario: params.idusuario,
			motivoTentativa: params.motivo,
		}),
	);
	if (!lock.adquirido) return "ignorada";

	const situacao = lock.resultado.resultado.situacao;
	if (situacao === "recuperada" || situacao === "autorizada")
		return "recuperada";
	if (situacao === "conflito") return "conflito";
	return "aguardando";
}

export async function conciliarNfcePendentes(params: {
	idempresa?: string;
	idusuario?: string | null;
	idnotafiscal?: string;
	limite?: number;
	motivo: string;
}): Promise<ResumoConciliacaoNfcePendentes> {
	const resumo: ResumoConciliacaoNfcePendentes = {
		analisadas: 0,
		recuperadas: 0,
		conflitos: 0,
		aguardando: 0,
		ignoradas: 0,
	};

	const notas = params.idnotafiscal
		? [{ id: params.idnotafiscal, idempresa: params.idempresa ?? "" }]
		: await listarNfceAguardandoConciliacao(params.limite ?? 15);

	for (const nota of notas) {
		if (
			params.idempresa &&
			nota.idempresa &&
			nota.idempresa !== params.idempresa
		) {
			resumo.ignoradas += 1;
			continue;
		}
		const idempresa = params.idempresa || nota.idempresa;
		if (!idempresa) {
			resumo.ignoradas += 1;
			continue;
		}
		resumo.analisadas += 1;
		const efeito = await conciliarNotaBloqueando({
			idnotafiscal: nota.id,
			idempresa,
			idusuario: params.idusuario,
			motivo: params.motivo,
		});
		if (efeito === "recuperada") resumo.recuperadas += 1;
		else if (efeito === "conflito") resumo.conflitos += 1;
		else if (efeito === "aguardando") resumo.aguardando += 1;
		else resumo.ignoradas += 1;
	}

	return resumo;
}

export async function conciliarNfcePendentesService(params: {
	idusuario: string;
	idempresa: string;
	idnotafiscal?: string;
}): Promise<
	HttpResponse<
		| ResumoConciliacaoNfcePendentes
		| (ResumoConciliacaoNfcePendentes & { resultado?: ResultadoEmissaoNfcePdv })
	>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	if (params.idnotafiscal) {
		const nota = await buscarNotaFiscalPorId(params.idnotafiscal);
		if (!nota || nota.idempresa !== params.idempresa)
			return httpNaoEncontrado();
	}

	const resumo = await conciliarNfcePendentes({
		idempresa: params.idempresa,
		idusuario: params.idusuario,
		...(params.idnotafiscal ? { idnotafiscal: params.idnotafiscal } : {}),
		motivo: "conciliacao_manual",
		limite: 20,
	});
	return httpOk(resumo);
}
