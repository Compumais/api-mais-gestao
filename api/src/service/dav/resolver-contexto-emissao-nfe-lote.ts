import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarDavsPorIds,
} from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { montarItensEmissaoDav } from "@/service/dav/montar-itens-emissao-dav.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const STATUS_CANCELADO = 3;

type ResolverContextoEmissaoNfeLoteParametros = {
	idusuario: string;
	iddavs: string[];
	idempresa: string;
};

export type ContextoEmissaoNfeLote = {
	iddavs: string[];
	codigosPedidos: number[];
	pendencias: string[];
	iddestinatario?: string;
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	formaPagamentoNfe?: string;
	informacoesAdicionais?: string;
	totais?: {
		desconto?: number;
	};
	itens: ItemPayloadNfe[];
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
	avisos?: string[];
};

function montarTextoDavs(identificadores: string[]): string {
	if (identificadores.length === 0) return "";
	return `DAV(s): ${identificadores.join(", ")}`;
}

function montarInformacoesAdicionais(
	observacoes: string[],
	identificadoresDav: string[],
): string {
	const partes: string[] = [];
	const obsUnicas = [
		...new Set(observacoes.map((o) => o.trim()).filter(Boolean)),
	];
	if (obsUnicas.length > 0) {
		partes.push(obsUnicas.join(" | "));
	}
	const textoDavs = montarTextoDavs(identificadoresDav);
	if (textoDavs) {
		partes.push(textoDavs);
	}
	return partes.join("\n").trim();
}

export async function resolverContextoEmissaoNfeLoteService({
	idusuario,
	iddavs,
	idempresa,
}: ResolverContextoEmissaoNfeLoteParametros): Promise<
	HttpResponse<ContextoEmissaoNfeLote>
> {
	const idsUnicos = [...new Set(iddavs.filter(Boolean))];

	if (idsUnicos.length === 0) {
		return httpBadRequest("Informe ao menos um pedido");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const davs = await buscarDavsPorIds(idsUnicos);

	if (davs.length !== idsUnicos.length) {
		return httpNaoEncontrado();
	}

	const avisos: string[] = [];
	const pendencias: string[] = [];
	const itens: ItemPayloadNfe[] = [];
	const codigosPedidos: number[] = [];
	const identificadoresDav: string[] = [];
	const observacoes: string[] = [];
	let descontoTotal = 0;

	const primeiro = davs.find((d) => d.id === idsUnicos[0]) ?? davs[0];
	if (!primeiro) {
		return httpNaoEncontrado();
	}

	const idcliente = primeiro.idcliente;

	for (const id of idsUnicos) {
		const dav = davs.find((d) => d.id === id);
		if (!dav) {
			return httpNaoEncontrado();
		}

		if (dav.idempresa !== idempresa) {
			return httpProibido();
		}

		if (dav.idnotafiscal) {
			return httpBadRequest(
				`Pedido ${dav.codigo ?? dav.id.slice(0, 8)} já faturado com NF-e`,
			);
		}

		if (dav.status === STATUS_CANCELADO) {
			return httpBadRequest(
				`Pedido ${dav.codigo ?? dav.id.slice(0, 8)} está cancelado`,
			);
		}

		if (!dav.idcliente) {
			return httpBadRequest(
				`Pedido ${dav.codigo ?? dav.id.slice(0, 8)} sem cliente vinculado`,
			);
		}

		if (dav.idcliente !== idcliente) {
			return httpBadRequest(
				"Todos os pedidos devem pertencer ao mesmo cliente",
			);
		}

		if (
			dav.idcondicaopagamento &&
			primeiro.idcondicaopagamento &&
			dav.idcondicaopagamento !== primeiro.idcondicaopagamento
		) {
			avisos.push(
				`Pedido ${dav.codigo ?? ""} tem condição de pagamento diferente do primeiro selecionado`,
			);
		}

		if (
			dav.idtipodocumentofinanceiro &&
			primeiro.idtipodocumentofinanceiro &&
			dav.idtipodocumentofinanceiro !== primeiro.idtipodocumentofinanceiro
		) {
			avisos.push(
				`Pedido ${dav.codigo ?? ""} tem forma de recebimento diferente do primeiro selecionado`,
			);
		}

		if (dav.codigo != null) {
			codigosPedidos.push(dav.codigo);
			identificadoresDav.push(String(dav.codigo));
		} else {
			identificadoresDav.push(dav.id.slice(0, 8));
		}

		if (dav.observacao?.trim()) {
			observacoes.push(dav.observacao.trim());
		}

		const desconto = parseFloat(dav.descontosubtotal ?? dav.desconto ?? "0");
		if (Number.isFinite(desconto) && desconto > 0) {
			descontoTotal += desconto;
		}

		const montagem = await montarItensEmissaoDav(idempresa, dav.id);
		itens.push(...montagem.itens);
		for (const p of montagem.pendencias) {
			pendencias.push(`Pedido ${dav.codigo ?? dav.id.slice(0, 8)}: ${p}`);
		}
	}

	if (itens.length === 0) {
		return httpBadRequest("Nenhum item válido encontrado nos pedidos");
	}

	let formaPagamentoNfe: string | undefined;
	if (primeiro.idtipodocumentofinanceiro) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			primeiro.idtipodocumentofinanceiro,
		);
		formaPagamentoNfe = tipoDoc?.formapagamentonfe?.trim() || undefined;
	}

	const informacoesAdicionais = montarInformacoesAdicionais(
		observacoes,
		identificadoresDav,
	);

	return httpOk<ContextoEmissaoNfeLote>({
		iddavs: idsUnicos,
		codigosPedidos,
		pendencias,
		iddestinatario: idcliente ?? undefined,
		...(primeiro.idtipodocumentofinanceiro
			? { idtipodocumento: primeiro.idtipodocumentofinanceiro }
			: {}),
		...(primeiro.idcondicaopagamento
			? { idcondicaopagto: primeiro.idcondicaopagamento }
			: {}),
		...(primeiro.idlocalestoque
			? { idlocalestoque: primeiro.idlocalestoque }
			: {}),
		...(formaPagamentoNfe ? { formaPagamentoNfe } : {}),
		informacoesAdicionais,
		...(descontoTotal > 0 ? { totais: { desconto: descontoTotal } } : {}),
		itens,
		gerarFinanceiro: true,
		gerarEstoque: true,
		...(avisos.length > 0 ? { avisos } : {}),
	});
}
