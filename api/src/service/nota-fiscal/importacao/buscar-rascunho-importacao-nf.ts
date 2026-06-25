import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosImportacaoItem,
	FornecedorSugeridoImportacao,
} from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalRascunhoPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { reidratarTributosRascunhoImportacao } from "./reidratar-tributos-xml-importacao.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarRascunhoImportacaoNfParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
};

type BuscarRascunhoImportacaoNfResposta = {
	nota: NotaFiscal;
	itens: Array<
		NotaFiscalItem & { dadosimportacao: DadosImportacaoItem | null }
	>;
	fornecedor: FornecedorSugeridoImportacao;
};

export async function buscarRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
}: BuscarRascunhoImportacaoNfParametros): Promise<
	HttpResponse<BuscarRascunhoImportacaoNfResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalRascunhoPorId(idRascunho, idempresa);

	if (!nota) {
		return httpNaoEncontrado();
	}

	const itens = await listarItensPorNotaFiscal(idRascunho);

	const itensComDados = itens.map((item) => ({
		...item,
		dadosimportacao: (item.dadosimportacao as DadosImportacaoItem | null) ?? null,
	}));

	const { nota: notaComTributos, itens: itensComTributos } =
		nota.arquivoxmlnotaoriginal
			? reidratarTributosRascunhoImportacao(
					nota,
					itensComDados,
					nota.arquivoxmlnotaoriginal,
				)
			: { nota, itens: itensComDados };

	let fornecedor: FornecedorSugeridoImportacao = {
		cnpj: nota.cnpjemissor ?? undefined,
		razaosocial: nota.razaosocial ?? undefined,
		inscricaoestadual: nota.inscricaoestadual ?? undefined,
		encontrado: false,
	};

	if (nota.identidade) {
		const entidade = await buscarEntidadePorId(nota.identidade);

		if (entidade) {
			fornecedor = {
				id: entidade.id,
				cnpj: entidade.cnpjcpf ?? nota.cnpjemissor ?? undefined,
				razaosocial: entidade.razaosocial ?? nota.razaosocial ?? undefined,
				inscricaoestadual:
					entidade.inscricaoestadual ?? nota.inscricaoestadual ?? undefined,
				encontrado: true,
			};
		}
	}

	return httpOk<BuscarRascunhoImportacaoNfResposta>({
		nota: notaComTributos,
		itens: itensComTributos,
		fornecedor,
	});
}
