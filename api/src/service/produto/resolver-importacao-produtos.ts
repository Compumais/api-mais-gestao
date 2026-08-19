import { randomUUID } from "node:crypto";
import type { NovoProduto } from "@/model/produto-model.js";
import { buscarCestPorCodigo } from "@/repositories/cest-repositories.js";
import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import { listarHierarquiasPorEmpresa } from "@/repositories/hierarquia-repositories.js";
import { buscarNcmPorCodigo } from "@/repositories/ncm-repositories.js";
import { listarIdentificadoresProdutos } from "@/repositories/produtos-repositories.js";
import { listarUnidadesMedidaPorEmpresa } from "@/repositories/unidade-medida-repositories.js";
import {
	COLUNAS_ALIQUOTA_PRODUTO,
	type LinhaImportacaoProduto,
	normalizarTextoCabecalho,
	type ResultadoValidacaoImportacaoProdutos,
} from "@/util/produtos-importacao.js";

export type ProdutoImportacaoResolvido = LinhaImportacaoProduto & {
	acao: "criar" | "atualizar";
	idExistente: string | null;
	codigoFinal: number | null;
	idgrupo: string | null;
	idunidademedida: string | null;
	unidademedida: string | null;
	idncm: string | null;
	idcest: string | null;
	idcfopentrada: string | null;
	idcfopsaida: string | null;
	idcfopsaidanfce: string | null;
};

function proximoCodigoLivre(
	usados: Set<number>,
	proximo: { valor: number },
): number {
	while (usados.has(proximo.valor)) {
		proximo.valor += 1;
	}
	const codigo = proximo.valor;
	usados.add(codigo);
	proximo.valor += 1;
	return codigo;
}

export async function resolverProdutosImportacao(parametros: {
	idempresa: string;
	validacao: ResultadoValidacaoImportacaoProdutos;
}): Promise<ProdutoImportacaoResolvido[]> {
	const { idempresa, validacao } = parametros;

	const [grupos, unidades, identificadores] = await Promise.all([
		listarHierarquiasPorEmpresa(idempresa),
		listarUnidadesMedidaPorEmpresa(idempresa),
		listarIdentificadoresProdutos(idempresa),
	]);

	const grupoPorCodigo = new Map<string, (typeof grupos)[number]>();
	const grupoPorNome = new Map<string, (typeof grupos)[number]>();
	for (const grupo of grupos) {
		if (grupo.codigo?.trim()) {
			grupoPorCodigo.set(grupo.codigo.trim(), grupo);
		}
		if (grupo.nome?.trim()) {
			grupoPorNome.set(normalizarTextoCabecalho(grupo.nome), grupo);
		}
	}

	const unidadePorSigla = new Map<string, (typeof unidades)[number]>();
	for (const unidade of unidades) {
		const sigla = unidade.codigo?.trim().toUpperCase();
		if (!sigla) continue;
		const atual = unidadePorSigla.get(sigla);
		if (!atual || unidade.idempresa === idempresa) {
			unidadePorSigla.set(sigla, unidade);
		}
	}

	const produtoPorCodigo = new Map<number, (typeof identificadores)[number]>();
	const produtoPorEan = new Map<string, (typeof identificadores)[number]>();
	const usados = new Set<number>();
	let maxCodigo = 0;

	for (const produto of identificadores) {
		if (produto.codigo != null) {
			produtoPorCodigo.set(produto.codigo, produto);
			usados.add(produto.codigo);
			if (produto.codigo > maxCodigo) {
				maxCodigo = produto.codigo;
			}
		}
		if (produto.ean) {
			produtoPorEan.set(String(produto.ean).replace(/\D/g, ""), produto);
		}
	}

	for (const linha of validacao.produtos) {
		if (linha.codigo != null) {
			usados.add(linha.codigo);
			if (linha.codigo > maxCodigo) {
				maxCodigo = linha.codigo;
			}
		}
	}

	const proximo = { valor: maxCodigo + 1 };
	const ncmCache = new Map<
		string,
		Awaited<ReturnType<typeof buscarNcmPorCodigo>>
	>();
	const cestCache = new Map<
		string,
		Awaited<ReturnType<typeof buscarCestPorCodigo>>
	>();
	const cfopCache = new Map<
		string,
		Awaited<ReturnType<typeof buscarCfopPorCodigo>>
	>();

	async function buscarNcm(codigo: string) {
		if (!ncmCache.has(codigo)) {
			ncmCache.set(codigo, await buscarNcmPorCodigo(idempresa, codigo));
		}
		return ncmCache.get(codigo);
	}

	async function buscarCest(codigo: string) {
		if (!cestCache.has(codigo)) {
			cestCache.set(codigo, await buscarCestPorCodigo(idempresa, codigo));
		}
		return cestCache.get(codigo);
	}

	async function buscarCfop(codigo: string) {
		if (!cfopCache.has(codigo)) {
			cfopCache.set(codigo, await buscarCfopPorCodigo(idempresa, codigo));
		}
		return cfopCache.get(codigo);
	}

	const resolvidos: ProdutoImportacaoResolvido[] = [];

	for (const linha of validacao.produtos) {
		const erros = [...linha.erros];
		const grupo =
			grupoPorCodigo.get(linha.grupo.trim()) ??
			grupoPorNome.get(normalizarTextoCabecalho(linha.grupo));

		if (!grupo) {
			erros.push(`Grupo "${linha.grupo}" não encontrado`);
		}

		const unidade = unidadePorSigla.get(linha.unidade.trim().toUpperCase());
		if (!unidade) {
			erros.push(`Unidade "${linha.unidade}" não encontrada`);
		}

		const ncm = linha.ncm ? await buscarNcm(linha.ncm) : undefined;
		let cestRegistro:
			| Awaited<ReturnType<typeof buscarCestPorCodigo>>
			| undefined;
		if (linha.cest) {
			cestRegistro = await buscarCest(linha.cest);
			if (!cestRegistro) {
				erros.push(`CEST "${linha.cest}" não encontrado`);
			}
		}

		let cfopEntrada:
			| Awaited<ReturnType<typeof buscarCfopPorCodigo>>
			| undefined;
		let cfopSaida: Awaited<ReturnType<typeof buscarCfopPorCodigo>> | undefined;
		let cfopNfce: Awaited<ReturnType<typeof buscarCfopPorCodigo>> | undefined;

		if (linha.cfopEntrada) {
			cfopEntrada = await buscarCfop(linha.cfopEntrada);
			if (!cfopEntrada) {
				erros.push(`CFOP de entrada "${linha.cfopEntrada}" não encontrado`);
			}
		}
		if (linha.cfopSaida) {
			cfopSaida = await buscarCfop(linha.cfopSaida);
			if (!cfopSaida) {
				erros.push(`CFOP de saída "${linha.cfopSaida}" não encontrado`);
			}
		}
		if (linha.cfopNfce) {
			cfopNfce = await buscarCfop(linha.cfopNfce);
			if (!cfopNfce) {
				erros.push(`CFOP NFC-e "${linha.cfopNfce}" não encontrado`);
			}
		}

		const existentePorCodigo =
			linha.codigo != null ? produtoPorCodigo.get(linha.codigo) : undefined;
		const existentePorEan = linha.ean
			? produtoPorEan.get(linha.ean)
			: undefined;
		const existente = existentePorCodigo ?? existentePorEan;

		if (
			existentePorCodigo &&
			existentePorEan &&
			existentePorCodigo.id !== existentePorEan.id
		) {
			erros.push("EAN já pertence a outro produto");
		}

		const acao: "criar" | "atualizar" = existente ? "atualizar" : "criar";
		let codigoFinal = linha.codigo ?? existente?.codigo ?? null;
		if (acao === "criar" && codigoFinal == null) {
			codigoFinal = proximoCodigoLivre(usados, proximo);
		}

		resolvidos.push({
			...linha,
			erros,
			acao,
			idExistente: existente?.id ?? null,
			codigoFinal,
			idgrupo: grupo?.id ?? null,
			idunidademedida: unidade?.id ?? null,
			unidademedida: unidade?.codigo ?? null,
			idncm: ncm?.id ?? null,
			idcest: cestRegistro?.id ?? null,
			idcfopentrada: cfopEntrada?.id ?? null,
			idcfopsaida: cfopSaida?.id ?? null,
			idcfopsaidanfce: cfopNfce?.id ?? null,
		});
	}

	return resolvidos;
}

export function montarDadosProdutoImportacao(
	idempresa: string,
	produto: ProdutoImportacaoResolvido,
): NovoProduto {
	const aliquotas = produto.aliquotas;
	const camposAliquota: Partial<NovoProduto> = {};

	for (const coluna of COLUNAS_ALIQUOTA_PRODUTO) {
		const valor = aliquotas[coluna.campo];
		if (valor) {
			camposAliquota[coluna.campo] = valor;
		}
	}

	return {
		id: produto.idExistente ?? randomUUID(),
		idempresa,
		codigo: produto.codigoFinal,
		ean: produto.ean,
		referencia: produto.referencia,
		nome: produto.nome,
		descricao: produto.nome.slice(0, 100),
		idunidademedida: produto.idunidademedida,
		unidademedida: produto.unidademedida,
		idgrupo: produto.idgrupo,
		preco: produto.preco,
		tipo: "P",
		ippt: produto.ippt ?? "P",
		origem: produto.origem ?? 0,
		ncm: produto.ncm,
		inativo: 0,
		...(produto.custo ? { custoaquisicao: produto.custo } : {}),
		...(produto.idncm ? { idncm: produto.idncm } : {}),
		...(produto.idcest && produto.cest
			? {
					idcest: produto.idcest,
					cest: Number.parseInt(produto.cest, 10),
				}
			: {}),
		...(produto.mva ? { percentualmva: produto.mva } : {}),
		...(produto.idcfopentrada ? { idcfopentrada: produto.idcfopentrada } : {}),
		...(produto.idcfopsaida ? { idcfopsaida: produto.idcfopsaida } : {}),
		...(produto.idcfopsaidanfce
			? { idcfopsaidanfce: produto.idcfopsaidanfce }
			: {}),
		...(produto.tipoproduto ? { tipoproduto: produto.tipoproduto } : {}),
		...(produto.situacaotributariasnentrada
			? { situacaotributariasnentrada: produto.situacaotributariasnentrada }
			: {}),
		...(produto.cst ? { situacaotributaria: produto.cst } : {}),
		...(produto.csosn ? { situacaotributariasn: produto.csosn } : {}),
		...(produto.tributacaoespecial
			? { tributacaoespecial: produto.tributacaoespecial }
			: {}),
		...(produto.tributacaosn ? { tributacaosn: produto.tributacaosn } : {}),
		...(produto.cstipientrada ? { cstipientrada: produto.cstipientrada } : {}),
		...(produto.cstipisaida ? { cstipisaida: produto.cstipisaida } : {}),
		...(produto.cstpisentrada ? { cstpisentrada: produto.cstpisentrada } : {}),
		...(produto.cstcofinsentrada
			? { cstcofinsentrada: produto.cstcofinsentrada }
			: {}),
		...(produto.cstpis ? { cstpis: produto.cstpis } : {}),
		...(produto.cstcofins ? { cstcofins: produto.cstcofins } : {}),
		...(produto.estoque != null
			? { quantidadepadrao: Math.max(0, Math.round(produto.estoque)) }
			: produto.acao === "criar"
				? { quantidadepadrao: 0 }
				: {}),
		...camposAliquota,
	};
}
