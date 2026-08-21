import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFichaProducao,
	buscarFichaProducaoAtivaPorProduto,
	buscarFichaProducaoPorId,
	listarItensFichaProducaoEnriquecidos,
	substituirItensFichaProducao,
} from "@/repositories/ficha-producao-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import type { ItemFichaProducaoInput } from "./criar-ficha-producao.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarFichaProducaoParametros = {
	id: string;
	idusuario: string;
	idprodutoacabado?: string;
	permiteproducaomassa?: boolean;
	producaonavenda?: boolean;
	observacao?: string | null;
	ativo?: boolean;
	itens?: ItemFichaProducaoInput[];
};

function normalizarQuantidade(valor: string): string {
	return valor.replace(",", ".");
}

export async function atualizarFichaProducaoService({
	id,
	idusuario,
	idprodutoacabado,
	permiteproducaomassa,
	producaonavenda,
	observacao,
	ativo,
	itens,
}: AtualizarFichaProducaoParametros): Promise<HttpResponse<unknown>> {
	const ficha = await buscarFichaProducaoPorId(id);
	if (!ficha) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		ficha.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const massa =
		permiteproducaomassa !== undefined
			? permiteproducaomassa
			: ficha.permiteproducaomassa === 1;
	const venda =
		producaonavenda !== undefined
			? producaonavenda
			: ficha.producaonavenda === 1;

	if (!massa && !venda) {
		return httpBadRequest(
			"Informe ao menos uma opção: produzir em massa ou produzir na venda",
		);
	}

	const produtoAlvo = idprodutoacabado ?? ficha.idprodutoacabado;

	if (idprodutoacabado && idprodutoacabado !== ficha.idprodutoacabado) {
		const produto = await buscarProdutoPorId(idprodutoacabado);
		if (!produto || produto.idempresa !== ficha.idempresa) {
			return httpBadRequest("Produto acabado não encontrado na empresa");
		}

		const outra = await buscarFichaProducaoAtivaPorProduto(
			ficha.idempresa,
			idprodutoacabado,
		);
		if (outra && outra.id !== id) {
			return httpBadRequest(
				"Já existe uma ficha de produção ativa para este produto",
			);
		}
	}

	if (itens !== undefined) {
		if (itens.length === 0) {
			return httpBadRequest("Informe ao menos um componente na ficha");
		}

		const idsComponentes = new Set<string>();
		const itensNormalizados = [];

		for (let i = 0; i < itens.length; i++) {
			const item = itens[i]!;
			if (item.idproduto === produtoAlvo) {
				return httpBadRequest(
					"O componente não pode ser o próprio produto acabado",
				);
			}
			if (idsComponentes.has(item.idproduto)) {
				return httpBadRequest("Componente duplicado na ficha");
			}
			idsComponentes.add(item.idproduto);

			const qtd = Number.parseFloat(normalizarQuantidade(item.quantidade));
			if (Number.isNaN(qtd) || qtd <= 0) {
				return httpBadRequest(
					`Quantidade inválida no componente na posição ${i + 1}`,
				);
			}

			const componente = await buscarProdutoPorId(item.idproduto);
			if (!componente || componente.idempresa !== ficha.idempresa) {
				return httpBadRequest(
					`Componente não encontrado na empresa (posição ${i + 1})`,
				);
			}

			itensNormalizados.push({
				id: uuidv4(),
				idfichaproducao: id,
				idproduto: item.idproduto,
				quantidade: qtd.toFixed(6),
				ordem: item.ordem ?? i,
			});
		}

		await substituirItensFichaProducao(id, itensNormalizados);
	}

	const agora = new Date().toISOString();
	const atualizada = await atualizarFichaProducao(id, {
		...(idprodutoacabado ? { idprodutoacabado } : {}),
		...(permiteproducaomassa !== undefined
			? { permiteproducaomassa: permiteproducaomassa ? 1 : 0 }
			: {}),
		...(producaonavenda !== undefined
			? { producaonavenda: producaonavenda ? 1 : 0 }
			: {}),
		...(observacao !== undefined ? { observacao } : {}),
		...(ativo !== undefined ? { ativo: ativo ? 1 : 0 } : {}),
		atualizadoem: agora,
		currenttimemillis: Date.now(),
	});

	if (!atualizada) {
		return httpErroInterno();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_ficha_producao",
		idusuario,
		recurso: "ficha_producao",
		idrecurso: id,
		idempresa: ficha.idempresa,
		criadoem: agora,
		metadados: {},
	});

	const [itensEnriquecidos, produtoAcabado] = await Promise.all([
		listarItensFichaProducaoEnriquecidos(id),
		buscarProdutoPorId(atualizada.idprodutoacabado),
	]);

	return httpOk({
		...atualizada,
		itens: itensEnriquecidos,
		nomeprodutoacabado: produtoAcabado?.nome ?? null,
		codigoprodutoacabado: produtoAcabado?.codigo ?? null,
		unidademedidaacabado: produtoAcabado?.unidademedida ?? null,
	});
}
