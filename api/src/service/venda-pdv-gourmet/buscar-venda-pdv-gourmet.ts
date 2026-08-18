import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import type { VendaPdvPagamento } from "@/model/venda-pdv-pagamento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { listarVendaPdvPagamentosPorVenda } from "@/repositories/venda-pdv-pagamento-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarVendaPdvGourmetParametros = {
	vendaPdvGourmetId: string;
	idusuario: string;
};

export type NfceVendaPdvGourmet = {
	idnotafiscal: string;
	status: number | null;
	chave: string | null;
	serie: string | null;
	numero: string | null;
	protocolo: string | null;
};

export type VendaPdvGourmetComPagamentos = VendaPdvGourmet & {
	pagamentos: VendaPdvPagamento[];
	nfce: NfceVendaPdvGourmet | null;
};

export async function buscarVendaPdvGourmetService({
	vendaPdvGourmetId,
	idusuario,
}: BuscarVendaPdvGourmetParametros): Promise<
	HttpResponse<VendaPdvGourmetComPagamentos | null>
> {
	const registro = await buscarVendaPdvGourmetPorId(vendaPdvGourmetId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const pagamentos = await listarVendaPdvPagamentosPorVenda(registro.id);
	const nfce = await montarNfceVendaPdv(registro.idnotafiscalnfce);

	return httpOk<VendaPdvGourmetComPagamentos>({
		...registro,
		pagamentos,
		nfce,
	});
}

async function montarNfceVendaPdv(
	idnotafiscalnfce: string | null,
): Promise<NfceVendaPdvGourmet | null> {
	if (!idnotafiscalnfce) {
		return null;
	}
	const nota = await buscarNotaFiscalPorId(idnotafiscalnfce);
	if (!nota) {
		return {
			idnotafiscal: idnotafiscalnfce,
			status: null,
			chave: null,
			serie: null,
			numero: null,
			protocolo: null,
		};
	}
	return {
		idnotafiscal: nota.id,
		status: nota.status,
		chave: nota.chavenfe ?? null,
		serie: nota.serie ?? null,
		numero: nota.numeronotafiscal ?? null,
		protocolo: nota.protocolonfe ?? null,
	};
}
