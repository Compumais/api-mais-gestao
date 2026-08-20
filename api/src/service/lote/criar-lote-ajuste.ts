import type { HttpResponse } from "@/model/http-model.js";
import type { Lote } from "@/model/lote-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarLotePorId } from "@/repositories/lote-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import { upsertLoteCadastro } from "@/service/lote/upsert-lote.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE } from "@/util/tipo-estoque.js";

export type CriarLoteAjusteParametros = {
	idusuario: string;
	idempresa: string;
	idproduto: string;
	numero: string;
	datafabricacao?: string | null | undefined;
	datavalidade?: string | null | undefined;
	codigoagregacao?: string | null | undefined;
	quantidadeAjuste?: number | undefined;
};

export async function criarLoteAjusteService(
	params: CriarLoteAjusteParametros,
): Promise<HttpResponse<Lote>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto || produto.idempresa !== params.idempresa) {
		return httpNaoEncontrado();
	}

	const numero = params.numero.trim();
	if (!numero) {
		return httpBadRequest("Número do lote é obrigatório");
	}

	const lote = await upsertLoteCadastro({
		idempresa: params.idempresa,
		idproduto: params.idproduto,
		numero,
		datafabricacao: params.datafabricacao ?? null,
		datavalidade: params.datavalidade ?? null,
		codigoagregacao: params.codigoagregacao ?? null,
	});

	const quantidadeAjuste = params.quantidadeAjuste ?? 0;
	if (quantidadeAjuste > 0) {
		await registrarMovimentoEstoque({
			idempresa: params.idempresa,
			idproduto: params.idproduto,
			quantidade: quantidadeAjuste.toFixed(6),
			sentido: "entrada",
			tipoestoque: TIPO_ESTOQUE.AMBOS,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.ACERTO,
			idlote: lote.id,
			observacao: `Ajuste lote ${lote.numero}`.slice(0, 50),
		});
		const atualizado = (await buscarLotePorId(lote.id)) ?? lote;
		return httpOk(atualizado);
	}

	return httpOk(lote);
}
