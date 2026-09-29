import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { carregarContextoEmissaoNfce } from "@/service/nfce-emissao/contexto-emissao-nfce.js";
import {
	avaliarElegibilidadeEmitirNfceVendaNaoFiscal,
	emitirNfceVendaNaoFiscalService,
} from "@/service/nfce-emissao/emitir-nfce-venda-nao-fiscal.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const LIMITE_LOTE = 100;

export type EmitirNfceVendasNaoFiscaisLoteParametros = {
	idusuario: string;
	idempresa: string;
	idsVendas: string[];
};

export type ItemEmitirNfceVendasNaoFiscaisLote = {
	idvenda: string;
	idnotafiscal: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	sucesso: boolean;
	ignorada: boolean;
	cStat: string | null;
	mensagem: string;
};

export type EmitirNfceVendasNaoFiscaisLoteResultado = {
	total: number;
	autorizadas: number;
	falhas: number;
	ignoradas: number;
	itens: ItemEmitirNfceVendasNaoFiscaisLote[];
};

function dedupeIdsEstavel(ids: string[]): string[] {
	const vistos = new Set<string>();
	const resultado: string[] = [];
	for (const id of ids) {
		const normalizado = id.trim();
		if (!normalizado || vistos.has(normalizado)) continue;
		vistos.add(normalizado);
		resultado.push(normalizado);
	}
	return resultado;
}

/**
 * Emite NFC-e em lote a partir de vendas não fiscais (ou tentativas falhas).
 * Processa sequencialmente; rejeições não interrompem o lote.
 * Falha de configuração fiscal da empresa aborta antes de reservar números.
 */
export async function emitirNfceVendasNaoFiscaisLoteService({
	idusuario,
	idempresa,
	idsVendas,
}: EmitirNfceVendasNaoFiscaisLoteParametros): Promise<
	HttpResponse<EmitirNfceVendasNaoFiscaisLoteResultado>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const ids = dedupeIdsEstavel(idsVendas).slice(0, LIMITE_LOTE);
	if (ids.length === 0) {
		return httpBadRequest("Informe ao menos uma venda para emitir NFC-e");
	}

	const contexto = await carregarContextoEmissaoNfce(idempresa);
	if (contexto.pendencias.length > 0) {
		return httpBadRequest(
			`Configuração fiscal incompleta: ${contexto.pendencias
				.map((p) => p.mensagem)
				.join("; ")}`,
		);
	}
	if (
		!contexto.empresa ||
		!contexto.empresaFiscal ||
		!contexto.nfceConfiguracao ||
		!contexto.certificadoAtivo
	) {
		return httpBadRequest("Contexto de emissão NFC-e incompleto");
	}

	const itens: ItemEmitirNfceVendasNaoFiscaisLote[] = [];
	let autorizadas = 0;
	let falhas = 0;
	let ignoradas = 0;

	for (const idvenda of ids) {
		const venda = await buscarVendaPdvGourmetPorId(idvenda);
		if (!venda) {
			ignoradas += 1;
			itens.push({
				idvenda,
				idnotafiscal: null,
				numeronotafiscal: null,
				serie: null,
				sucesso: false,
				ignorada: true,
				cStat: null,
				mensagem: "Venda não encontrada",
			});
			continue;
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
			ignoradas += 1;
			itens.push({
				idvenda,
				idnotafiscal: notaExistente?.id ?? null,
				numeronotafiscal: notaExistente?.numeronotafiscal ?? null,
				serie: notaExistente?.serie ?? null,
				sucesso: false,
				ignorada: true,
				cStat: null,
				mensagem: elegibilidade.motivo,
			});
			continue;
		}

		const resultado = await emitirNfceVendaNaoFiscalService({
			idusuario,
			idempresa,
			idvenda,
			pularVerificacaoUsuario: true,
		});

		if (!resultado.success) {
			falhas += 1;
			itens.push({
				idvenda,
				idnotafiscal: notaExistente?.id ?? null,
				numeronotafiscal: notaExistente?.numeronotafiscal ?? null,
				serie: notaExistente?.serie ?? null,
				sucesso: false,
				ignorada: false,
				cStat: null,
				mensagem: resultado.error ?? "Falha ao emitir NFC-e",
			});
			continue;
		}

		const body = resultado.body;
		const emitida = Boolean(body?.emitida);
		const mensagem =
			body?.jaEmitida
				? "NFC-e já autorizada"
				: emitida
					? "NFC-e autorizada"
					: (body?.xMotivo ??
						body?.erro ??
						body?.pendencias?.map((p) => p.mensagem).join("; ") ??
						"NFC-e não autorizada");

		if (emitida) {
			autorizadas += 1;
		} else {
			falhas += 1;
		}

		itens.push({
			idvenda,
			idnotafiscal: body?.idnotafiscal ?? notaExistente?.id ?? null,
			numeronotafiscal:
				body?.numero != null
					? String(body.numero)
					: (notaExistente?.numeronotafiscal ?? null),
			serie: body?.serie ?? notaExistente?.serie ?? null,
			sucesso: emitida,
			ignorada: false,
			cStat: body?.cStat ?? null,
			mensagem,
		});
	}

	return httpOk({
		total: itens.length,
		autorizadas,
		falhas,
		ignoradas,
		itens,
	});
}
