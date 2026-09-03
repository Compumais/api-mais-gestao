import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorChaveNfe,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarVendaParaReconciliacaoNfce,
	executarComLockReconciliacaoNfce,
	listarDeltaNfcePdv,
} from "@/repositories/reconciliacao-nfce-pdv-repositories.js";
import { buscarTerminalPdvAtivoPorNumero } from "@/repositories/terminal-pdv-repositories.js";
import { atualizarVendaPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { reconciliarNfceAutorizadaSefaz } from "./reconciliar-nfce-autorizada-sefaz.js";
import { transmitirNfceContingenciaService } from "./transmitir-nfce-contingencia.js";

export const STATUS_LOCAL_NFCE = [
	"nenhuma",
	"nao_fiscal",
	"pendente",
	"pendente_contingencia",
	"contingencia",
	"transmitida",
	"autorizada",
	"erro",
	"erro_config",
	"cancelada",
	"inutilizada",
] as const;

export type StatusLocalNfce = (typeof STATUS_LOCAL_NFCE)[number];
export type AcaoReconciliacaoNfce =
	| "sincronizada"
	| "registrada"
	| "reconciliada"
	| "aguardando_venda"
	| "conflito"
	| "erro";

export type ManifestoNfcePdv = {
	idvendalocal: string;
	idvendaremoto?: string;
	idnotafiscal?: string;
	statusLocal: StatusLocalNfce;
	chave?: string;
	serie?: number;
	numero?: number;
	protocolo?: string;
	xml?: string;
	motivoContingencia?: string;
	dataContingencia?: string;
};

export type ItemReconciliacaoNfce = {
	idvendalocal: string;
	idvendaremoto?: string;
	existeRetaguarda: boolean;
	idnotafiscal?: string;
	status?: string;
	chave?: string;
	serie?: number;
	numero?: number;
	protocolo?: string;
	atualizadoEm?: string;
	acao: AcaoReconciliacaoNfce;
	mensagem?: string;
};

type ReconciliarNfcePdvParametros = {
	idusuario: string;
	idempresa: string;
	numeropdv: number;
	cicloId: string;
	cursor?: string;
	limite: number;
	notas: ManifestoNfcePdv[];
};

type ResumoReconciliacaoNfce = {
	total: number;
	sincronizadas: number;
	registradas: number;
	reconciliadas: number;
	aguardandoVenda: number;
	conflitos: number;
	erros: number;
};

export type ReconciliarNfcePdvResultado = {
	cicloId: string;
	servidorEm: string;
	proximoCursor: string;
	itens: ItemReconciliacaoNfce[];
	resumo: ResumoReconciliacaoNfce;
};

function normalizarChave(chave?: string | null): string | undefined {
	const digitos = (chave ?? "").replace(/\D/g, "");
	return digitos.length === 44 ? digitos : undefined;
}

export function statusCanonicoNfce(status: number | null | undefined): string {
	switch (status) {
		case NFE_STATUS.PENDENTE:
			return "pendente";
		case NFE_STATUS.AUTORIZADA:
			return "autorizada";
		case NFE_STATUS.CANCELADA:
		case NFE_STATUS.CANCELADA_FORA_PRAZO:
			return "cancelada";
		case NFE_STATUS.INUTILIZADA:
			return "inutilizada";
		case NFE_STATUS.REJEITADA:
			return "rejeitada";
		case NFE_STATUS.DENEGADA:
			return "denegada";
		default:
			return status == null ? "nenhuma" : `status_${status}`;
	}
}

function numeroPositivo(valor?: string | number | null): number | undefined {
	const numero = Number(valor);
	return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

function atualizadoEmNota(nota: NotaFiscal): string | undefined {
	return (
		nota.dataalteracao ?? nota.datainclusao ?? nota.datahoraemissao ?? undefined
	);
}

function itemDaNota({
	idvendalocal,
	idvendaremoto,
	nota,
	acao,
	mensagem,
}: {
	idvendalocal: string;
	idvendaremoto: string;
	nota: NotaFiscal;
	acao: AcaoReconciliacaoNfce;
	mensagem?: string;
}): ItemReconciliacaoNfce {
	const chave = normalizarChave(nota.chavenfe);
	const serie = numeroPositivo(nota.serie);
	const numero = numeroPositivo(nota.numeronotafiscal);
	const atualizadoEm = atualizadoEmNota(nota);

	return {
		idvendalocal,
		idvendaremoto,
		existeRetaguarda: true,
		idnotafiscal: nota.id,
		status: statusCanonicoNfce(nota.status),
		...(chave ? { chave } : {}),
		...(serie ? { serie } : {}),
		...(numero ? { numero } : {}),
		...(nota.protocolonfe ? { protocolo: nota.protocolonfe } : {}),
		...(atualizadoEm ? { atualizadoEm } : {}),
		acao,
		...(mensagem ? { mensagem } : {}),
	};
}

async function reconciliarManifesto(
	parametros: ReconciliarNfcePdvParametros,
	manifesto: ManifestoNfcePdv,
): Promise<ItemReconciliacaoNfce> {
	let venda = await buscarVendaParaReconciliacaoNfce({
		idempresa: parametros.idempresa,
		numeropdv: parametros.numeropdv,
		idvendalocal: manifesto.idvendalocal,
		...(manifesto.idvendaremoto
			? { idvendaremoto: manifesto.idvendaremoto }
			: {}),
	});

	if (!venda) {
		return {
			idvendalocal: manifesto.idvendalocal,
			...(manifesto.idvendaremoto
				? { idvendaremoto: manifesto.idvendaremoto }
				: {}),
			existeRetaguarda: false,
			acao: "aguardando_venda",
			mensagem: "Venda ainda não recebida pela retaguarda",
		};
	}

	if (
		venda.idempresa !== parametros.idempresa ||
		venda.numeropdv !== parametros.numeropdv ||
		venda.vendalocal !== 3 ||
		(venda.idvendalocal != null &&
			venda.idvendalocal !== manifesto.idvendalocal)
	) {
		return {
			idvendalocal: manifesto.idvendalocal,
			existeRetaguarda: false,
			acao: "conflito",
			mensagem: "Identidade da venda diverge da empresa ou do PDV",
		};
	}

	if (!venda.idvendalocal) {
		try {
			venda =
				(await atualizarVendaPdvGourmet(venda.id, {
					idvendalocal: manifesto.idvendalocal,
				})) ?? venda;
		} catch {
			return {
				idvendalocal: manifesto.idvendalocal,
				idvendaremoto: venda.id,
				existeRetaguarda: true,
				acao: "conflito",
				mensagem: "Venda local já vinculada a outro registro da retaguarda",
			};
		}
	}

	let acao: AcaoReconciliacaoNfce = "sincronizada";
	let idnotafiscal = venda.idnotafiscalnfce ?? undefined;

	if (!idnotafiscal && (manifesto.idnotafiscal || manifesto.chave)) {
		let notaDoManifesto = manifesto.idnotafiscal
			? await buscarNotaFiscalPorId(manifesto.idnotafiscal)
			: undefined;

		if (!notaDoManifesto && manifesto.chave) {
			notaDoManifesto = await buscarNotaFiscalPorChaveNfe(
				parametros.idempresa,
				manifesto.chave,
			);
		}

		if (notaDoManifesto) {
			if (
				notaDoManifesto.idempresa !== parametros.idempresa ||
				notaDoManifesto.modelo !== "65"
			) {
				return {
					idvendalocal: manifesto.idvendalocal,
					idvendaremoto: venda.id,
					existeRetaguarda: true,
					acao: "conflito",
					mensagem: "NFC-e informada pelo PDV pertence a outro contexto fiscal",
				};
			}

			try {
				await atualizarVendaPdvGourmet(venda.id, {
					idnotafiscalnfce: notaDoManifesto.id,
				});
			} catch {
				return {
					idvendalocal: manifesto.idvendalocal,
					idvendaremoto: venda.id,
					existeRetaguarda: true,
					acao: "conflito",
					mensagem: "NFC-e já vinculada a outra venda da retaguarda",
				};
			}

			idnotafiscal = notaDoManifesto.id;
			acao = "reconciliada";
		}
	}

	if (!idnotafiscal) {
		const chave = normalizarChave(manifesto.chave);
		if (!manifesto.xml || !chave || !manifesto.serie || !manifesto.numero) {
			return {
				idvendalocal: manifesto.idvendalocal,
				idvendaremoto: venda.id,
				existeRetaguarda: true,
				status: "nenhuma",
				acao: "aguardando_venda",
				mensagem: "NFC-e sem payload fiscal suficiente para registro",
			};
		}

		const contingencia = await transmitirNfceContingenciaService({
			idusuario: parametros.idusuario,
			idempresa: parametros.idempresa,
			idvenda: venda.id,
			xml: manifesto.xml,
			chave,
			serie: manifesto.serie,
			numero: manifesto.numero,
			motivo:
				manifesto.motivoContingencia ??
				"Sincronização de NFC-e emitida pelo PDV",
			datacontingencia: manifesto.dataContingencia ?? new Date().toISOString(),
		});

		if (!contingencia.success || !contingencia.body) {
			return {
				idvendalocal: manifesto.idvendalocal,
				idvendaremoto: venda.id,
				existeRetaguarda: true,
				acao: "erro",
				mensagem: contingencia.success
					? "NFC-e não foi registrada"
					: contingencia.error,
			};
		}

		idnotafiscal = contingencia.body.idnotafiscal;
		await atualizarVendaPdvGourmet(venda.id, {
			idnotafiscalnfce: idnotafiscal,
		});
		acao = "registrada";
	}

	let nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (
		!nota ||
		nota.idempresa !== parametros.idempresa ||
		nota.modelo !== "65"
	) {
		return {
			idvendalocal: manifesto.idvendalocal,
			idvendaremoto: venda.id,
			existeRetaguarda: true,
			acao: "conflito",
			mensagem: "Vínculo fiscal da venda é inválido",
		};
	}

	const chaveLocal = normalizarChave(manifesto.chave);
	const chaveRetaguarda = normalizarChave(nota.chavenfe);
	if (
		manifesto.statusLocal === "autorizada" &&
		chaveLocal &&
		chaveRetaguarda &&
		chaveLocal !== chaveRetaguarda
	) {
		return itemDaNota({
			idvendalocal: manifesto.idvendalocal,
			idvendaremoto: venda.id,
			nota,
			acao: "conflito",
			mensagem: "Chave autorizada no PDV diverge da retaguarda",
		});
	}

	if (
		manifesto.statusLocal === "autorizada" &&
		chaveLocal === chaveRetaguarda &&
		(nota.status === NFE_STATUS.PENDENTE ||
			nota.status === NFE_STATUS.REJEITADA)
	) {
		const reconciliada = await reconciliarNfceAutorizadaSefaz(nota);
		if (reconciliada) {
			nota = (await buscarNotaFiscalPorId(nota.id)) ?? nota;
			acao = "reconciliada";
		}
	}

	return itemDaNota({
		idvendalocal: manifesto.idvendalocal,
		idvendaremoto: venda.id,
		nota,
		acao,
	});
}

function montarResumo(itens: ItemReconciliacaoNfce[]): ResumoReconciliacaoNfce {
	return {
		total: itens.length,
		sincronizadas: itens.filter((item) => item.acao === "sincronizada").length,
		registradas: itens.filter((item) => item.acao === "registrada").length,
		reconciliadas: itens.filter((item) => item.acao === "reconciliada").length,
		aguardandoVenda: itens.filter((item) => item.acao === "aguardando_venda")
			.length,
		conflitos: itens.filter((item) => item.acao === "conflito").length,
		erros: itens.filter((item) => item.acao === "erro").length,
	};
}

async function executarCiclo(
	parametros: ReconciliarNfcePdvParametros,
): Promise<ReconciliarNfcePdvResultado> {
	const servidorEm = new Date().toISOString();
	const itensManifestados: ItemReconciliacaoNfce[] = [];

	for (const manifesto of parametros.notas) {
		try {
			itensManifestados.push(await reconciliarManifesto(parametros, manifesto));
		} catch (erro) {
			console.error({
				evento: "nfce_pdv_reconciliacao_item_erro",
				cicloId: parametros.cicloId,
				idempresa: parametros.idempresa,
				numeropdv: parametros.numeropdv,
				idvendalocal: manifesto.idvendalocal,
				erro: erro instanceof Error ? erro.message : String(erro),
			});
			itensManifestados.push({
				idvendalocal: manifesto.idvendalocal,
				...(manifesto.idvendaremoto
					? { idvendaremoto: manifesto.idvendaremoto }
					: {}),
				existeRetaguarda: false,
				acao: "erro",
				mensagem: "Falha ao reconciliar o item",
			});
		}
	}

	const idsManifestados = new Set(
		itensManifestados.map((item) => item.idvendalocal),
	);
	const delta = await listarDeltaNfcePdv({
		idempresa: parametros.idempresa,
		numeropdv: parametros.numeropdv,
		...(parametros.cursor ? { cursor: parametros.cursor } : {}),
		servidorEm,
		limite: parametros.limite,
	});
	const itensDelta: ItemReconciliacaoNfce[] = delta
		.filter((item): item is typeof item & { idvendalocal: string } =>
			Boolean(item.idvendalocal && !idsManifestados.has(item.idvendalocal)),
		)
		.map((item) => ({
			idvendalocal: item.idvendalocal,
			idvendaremoto: item.idvendaremoto,
			existeRetaguarda: true,
			...(item.idnotafiscal ? { idnotafiscal: item.idnotafiscal } : {}),
			status: statusCanonicoNfce(item.status),
			...(normalizarChave(item.chave)
				? { chave: normalizarChave(item.chave) }
				: {}),
			...(numeroPositivo(item.serie)
				? { serie: numeroPositivo(item.serie) }
				: {}),
			...(numeroPositivo(item.numero)
				? { numero: numeroPositivo(item.numero) }
				: {}),
			...(item.protocolo ? { protocolo: item.protocolo } : {}),
			...(item.atualizadoEm ? { atualizadoEm: item.atualizadoEm } : {}),
			acao: "sincronizada" as const,
		}));
	const itens = [...itensManifestados, ...itensDelta];
	const ultimoDelta = delta.at(-1);
	const proximoCursor =
		delta.length >= parametros.limite && ultimoDelta?.atualizadoEm
			? `${ultimoDelta.atualizadoEm}|${ultimoDelta.idvendaremoto}`
			: `${servidorEm}|`;

	console.info({
		evento: "nfce_pdv_reconciliacao_concluida",
		cicloId: parametros.cicloId,
		idempresa: parametros.idempresa,
		numeropdv: parametros.numeropdv,
		manifestos: parametros.notas.length,
		delta: itensDelta.length,
	});

	return {
		cicloId: parametros.cicloId,
		servidorEm,
		proximoCursor,
		itens,
		resumo: montarResumo(itens),
	};
}

export async function reconciliarNfcePdvService(
	parametros: ReconciliarNfcePdvParametros,
): Promise<HttpResponse<ReconciliarNfcePdvResultado | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) {
		return httpProibido();
	}
	if (
		!(await buscarTerminalPdvAtivoPorNumero(
			parametros.idempresa,
			parametros.numeropdv,
		))
	) {
		return httpBadRequest("Terminal PDV ausente ou inativo", {
			codigoErro: "TERMINAL_PDV_AUSENTE",
		});
	}

	const ciclo = await executarComLockReconciliacaoNfce(
		parametros.idempresa,
		parametros.numeropdv,
		() => executarCiclo(parametros),
	);
	if (!ciclo.adquirido) {
		return {
			success: false,
			status: 409,
			error: "Sincronização NFC-e já está em andamento para este PDV",
			code: "SYNC_NFCE_EM_ANDAMENTO",
		};
	}

	return httpOk(ciclo.resultado);
}
