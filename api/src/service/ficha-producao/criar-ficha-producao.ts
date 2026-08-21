import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFichaProducaoAtivaPorProduto,
	criarFichaProducaoComItens,
	listarItensFichaProducaoEnriquecidos,
} from "@/repositories/ficha-producao-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

export type ItemFichaProducaoInput = {
	idproduto: string;
	quantidade: string;
	ordem?: number;
};

export type CriarFichaProducaoParametros = {
	idusuario: string;
	idempresa: string;
	idprodutoacabado: string;
	permiteproducaomassa: boolean;
	producaonavenda: boolean;
	observacao?: string | null;
	itens: ItemFichaProducaoInput[];
};

function normalizarQuantidade(valor: string): string {
	return valor.replace(",", ".");
}

export async function criarFichaProducaoService({
	idusuario,
	idempresa,
	idprodutoacabado,
	permiteproducaomassa,
	producaonavenda,
	observacao,
	itens,
}: CriarFichaProducaoParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!permiteproducaomassa && !producaonavenda) {
		return httpBadRequest(
			"Informe ao menos uma opção: produzir em massa ou produzir na venda",
		);
	}

	if (!itens || itens.length === 0) {
		return httpBadRequest("Informe ao menos um componente na ficha");
	}

	const produtoAcabado = await buscarProdutoPorId(idprodutoacabado);
	if (!produtoAcabado || produtoAcabado.idempresa !== idempresa) {
		return httpBadRequest("Produto acabado não encontrado na empresa");
	}

	const fichaExistente = await buscarFichaProducaoAtivaPorProduto(
		idempresa,
		idprodutoacabado,
	);
	if (fichaExistente) {
		return httpBadRequest(
			"Já existe uma ficha de produção ativa para este produto",
		);
	}

	const idsComponentes = new Set<string>();
	const itensNormalizados = [];

	for (let i = 0; i < itens.length; i++) {
		const item = itens[i]!;
		if (item.idproduto === idprodutoacabado) {
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
		if (!componente || componente.idempresa !== idempresa) {
			return httpBadRequest(
				`Componente não encontrado na empresa (posição ${i + 1})`,
			);
		}

		itensNormalizados.push({
			id: uuidv4(),
			idfichaproducao: "", // preenchido após gerar id da ficha
			idproduto: item.idproduto,
			quantidade: qtd.toFixed(6),
			ordem: item.ordem ?? i,
		});
	}

	const idFicha = uuidv4();
	const agora = new Date().toISOString();

	const resultado = await criarFichaProducaoComItens(
		{
			id: idFicha,
			idempresa,
			idprodutoacabado,
			ativo: 1,
			permiteproducaomassa: permiteproducaomassa ? 1 : 0,
			producaonavenda: producaonavenda ? 1 : 0,
			observacao: observacao ?? null,
			currenttimemillis: Date.now(),
			criadoem: agora,
			atualizadoem: agora,
		},
		itensNormalizados.map((item) => ({
			...item,
			idfichaproducao: idFicha,
		})),
	);

	if (!resultado) {
		return httpErroInterno();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_ficha_producao",
		idusuario,
		recurso: "ficha_producao",
		idrecurso: idFicha,
		idempresa,
		criadoem: agora,
		metadados: {
			idprodutoacabado,
			componentes: itensNormalizados.length,
		},
	});

	const itensEnriquecidos = await listarItensFichaProducaoEnriquecidos(idFicha);

	return httpCriacao({
		...resultado.ficha,
		itens: itensEnriquecidos,
		nomeprodutoacabado: produtoAcabado.nome,
		codigoprodutoacabado: produtoAcabado.codigo,
		unidademedidaacabado: produtoAcabado.unidademedida,
	});
}
