import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { listarItensPorVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { resolverVendaPorNotaFiscalNfce } from "@/service/nfce-emissao/resolver-venda-nfce.js";

const STATUS_EDITAVEL_NFCE = new Set<number>([
	NFE_STATUS.PENDENTE,
	NFE_STATUS.REJEITADA,
	NFE_STATUS.DENEGADA,
]);

export type ItemNfceEdicao = {
	idproduto: string;
	nomeproduto: string;
	codigo: number | null;
	quantidade: string;
	precounitario: string;
	unidademedida: string | null;
};

export type NfceParaEditar = {
	nota: {
		idnotafiscal: string;
		numeronotafiscal: string | null;
		serie: string | null;
		chavenfe: string | null;
		status: number | null;
		mensagemtransmissaonfe: string | null;
		tipoambientenfe: number | null;
		valortotalnota: string | null;
	};
	venda: {
		id: string;
		valordinheiro: string | null;
		valorcartao: string | null;
		valorcartaocredito: string | null;
		valorcartaodebito: string | null;
		valorpix: string | null;
		valorprepago: string | null;
		valortroco: string | null;
		valortotal: string | null;
	};
	itens: ItemNfceEdicao[];
};

type BuscarNfceParaEditarParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
};

export async function buscarNfceParaEditarService({
	idusuario,
	idempresa,
	idnotafiscal,
}: BuscarNfceParaEditarParametros): Promise<HttpResponse<NfceParaEditar>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resolvido = await resolverVendaPorNotaFiscalNfce(idnotafiscal, idempresa);
	if (!resolvido) {
		return httpNaoEncontrado();
	}

	const { nota, venda } = resolvido;

	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("NFC-e autorizada não pode ser alterada");
	}

	if (nota.status == null || !STATUS_EDITAVEL_NFCE.has(nota.status)) {
		return httpBadRequest(
			"Somente NFC-e pendentes, rejeitadas ou denegadas podem ser alteradas",
		);
	}

	const itensVenda = await listarItensPorVendaPdv(venda.id);
	const itens: ItemNfceEdicao[] = [];

	for (const itemVenda of itensVenda) {
		if (!itemVenda.idproduto) continue;

		const produto = await buscarProdutoPorId(itemVenda.idproduto);

		itens.push({
			idproduto: itemVenda.idproduto,
			nomeproduto:
				produto?.nome ??
				produto?.descricao ??
				`Produto ${produto?.codigo ?? ""}`.trim(),
			codigo: produto?.codigo ?? null,
			quantidade: itemVenda.quantidade ?? "0",
			precounitario: itemVenda.precounitario ?? "0",
			unidademedida: produto?.unidademedida ?? null,
		});
	}

	return httpOk({
		nota: {
			idnotafiscal: nota.id,
			numeronotafiscal: nota.numeronotafiscal,
			serie: nota.serie,
			chavenfe: nota.chavenfe,
			status: nota.status,
			mensagemtransmissaonfe: nota.mensagemtransmissaonfe,
			tipoambientenfe: nota.tipoambientenfe,
			valortotalnota: nota.valortotalnota,
		},
		venda: {
			id: venda.id,
			valordinheiro: venda.valordinheiro,
			valorcartao: venda.valorcartao,
			valorcartaocredito: venda.valorcartaocredito,
			valorcartaodebito: venda.valorcartaodebito,
			valorpix: venda.valorpix,
			valorprepago: venda.valorprepago,
			valortroco: venda.valortroco,
			valortotal: venda.valortotal,
		},
		itens,
	});
}
