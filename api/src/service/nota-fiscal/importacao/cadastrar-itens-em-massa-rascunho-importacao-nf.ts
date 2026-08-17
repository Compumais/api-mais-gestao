import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosImportacaoItem,
	DadosImportacaoNota,
} from "@/model/nota-fiscal-importacao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarItemNotaFiscal,
	buscarNotaFiscalRascunhoPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { validarEanProdutoNf } from "@/service/nota-fiscal/validar-ean-produto-nf.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { normalizarCodigoBarras } from "@/util/texto-util.js";

type CadastrarItensEmMassaRascunhoParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
	idsItens?: string[] | undefined;
};

export type ItemIgnoradoCadastroEmMassa = {
	idItem: string;
	contador: number | null;
	descricao: string;
	motivo: string;
};

export type CadastrarItensEmMassaRascunhoResposta = {
	quantidadeCadastrados: number;
	quantidadeIgnorados: number;
	ignorados: ItemIgnoradoCadastroEmMassa[];
};

function descricaoItem(
	dados: DadosImportacaoItem | null,
	descricaoItemNota: string | null,
): string {
	return (
		dados?.descricaoFornecedor || descricaoItemNota || "Item sem descrição"
	);
}

export async function cadastrarItensEmMassaRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
	idsItens,
}: CadastrarItensEmMassaRascunhoParametros): Promise<
	HttpResponse<CadastrarItensEmMassaRascunhoResposta>
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

	if (idsItens && idsItens.length === 0) {
		return httpBadRequest("Selecione ao menos um item para cadastrar");
	}

	const itens = await listarItensPorNotaFiscal(idRascunho);
	const idsSelecionados = idsItens ? new Set(idsItens) : null;
	const dadosNota = (nota.dadosimportacao as DadosImportacaoNota | null) ?? {};
	const grupoPadrao = dadosNota.idgrupoPadrao;
	const eansNoLote = new Set<string>();
	const ignorados: ItemIgnoradoCadastroEmMassa[] = [];
	let quantidadeCadastrados = 0;

	for (const item of itens) {
		if (idsSelecionados && !idsSelecionados.has(item.id)) {
			continue;
		}

		const dadosAtuais = item.dadosimportacao as DadosImportacaoItem | null;
		const descricao = descricaoItem(dadosAtuais, item.descricao);

		if (!dadosAtuais) {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo: "Sem dados de importação",
			});
			continue;
		}

		if (dadosAtuais.statusVinculo !== "pendente") {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo:
					dadosAtuais.statusVinculo === "vinculado"
						? "Item já vinculado a um produto"
						: "Item já marcado para cadastro",
			});
			continue;
		}

		const idgrupo = dadosAtuais.idgrupo || grupoPadrao;
		if (!idgrupo) {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo: "Informe o grupo padrão da nota ou o grupo do item",
			});
			continue;
		}

		if (!dadosAtuais.idunidademedida) {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo: "Informe a unidade de medida do produto",
			});
			continue;
		}

		const eanNormalizado = normalizarCodigoBarras(dadosAtuais.eanXml);
		if (eanNormalizado && eansNoLote.has(eanNormalizado)) {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo: `O código de barras ${eanNormalizado} se repete nesta nota. Cadastre um item e vincule os demais.`,
			});
			continue;
		}

		const validacaoEan = await validarEanProdutoNf(
			idempresa,
			dadosAtuais.eanXml,
		);

		if (!validacaoEan.valido) {
			ignorados.push({
				idItem: item.id,
				contador: item.contador,
				descricao,
				motivo: validacaoEan.mensagem,
			});
			continue;
		}

		const dadosAtualizados: DadosImportacaoItem = {
			...dadosAtuais,
			statusVinculo: "novo",
			idproduto: undefined,
			produtoEncontrado: undefined,
			confirmarCadastro: true,
			idgrupo,
		};

		await atualizarItemNotaFiscal(item.id, {
			idproduto: null,
			dadosimportacao: dadosAtualizados,
		});

		if (eanNormalizado) {
			eansNoLote.add(eanNormalizado);
		}

		quantidadeCadastrados += 1;
	}

	if (idsSelecionados) {
		for (const idItem of idsSelecionados) {
			const existe = itens.some((item) => item.id === idItem);
			if (existe) continue;

			ignorados.push({
				idItem,
				contador: null,
				descricao: "Item não encontrado",
				motivo: "Item não pertence a este rascunho",
			});
		}
	}

	if (
		!idsSelecionados &&
		quantidadeCadastrados === 0 &&
		ignorados.length === 0
	) {
		return httpBadRequest("Nenhum item pendente para cadastrar");
	}

	return httpOk({
		quantidadeCadastrados,
		quantidadeIgnorados: ignorados.length,
		ignorados,
	});
}
