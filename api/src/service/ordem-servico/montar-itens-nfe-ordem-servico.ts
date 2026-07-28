import type { ConfiguracaoOrdemServico } from "@/model/configuracao-ordem-servico-model.js";
import { buscarCestPorId } from "@/repositories/cest-repositories.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarNcmPorId } from "@/repositories/ncm-repositories.js";
import { listarItensPorOrdemServico } from "@/repositories/ordem-servico-item-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { normalizarCodigoCest } from "@/util/validar-cest-item-emissao-nfe.js";

async function resolverCodigoCfop(
	ids: Array<string | null | undefined>,
): Promise<string | undefined> {
	for (const id of ids) {
		if (!id) continue;
		const cfop = await buscarCfopPorId(id);
		const codigo = cfop?.codigo?.replace(/\D/g, "");
		if (codigo) return codigo;
	}
	return undefined;
}

async function resolverNcmProduto(
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): Promise<string> {
	const ncmDireto = produto.ncm?.replace(/\D/g, "") ?? "";
	if (ncmDireto) return ncmDireto;
	if (produto.idncm) {
		const ncmCadastro = await buscarNcmPorId(produto.idncm);
		return ncmCadastro?.codigo?.replace(/\D/g, "") ?? "";
	}
	return "";
}

async function resolverCestProduto(
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): Promise<string | undefined> {
	if (produto.idcest) {
		const cest = await buscarCestPorId(produto.idcest);
		const codigo = normalizarCodigoCest(cest?.codigo);
		if (codigo?.length === 7) return codigo;
	}
	const cestLegado = normalizarCodigoCest(produto.cest);
	return cestLegado?.length === 7 ? cestLegado : undefined;
}

function formatarSituacaoTributaria(
	valor: string | number | null | undefined,
): string | undefined {
	if (valor == null) return undefined;
	const texto = String(valor).trim().replace(/\D/g, "");
	return texto || undefined;
}

export async function montarItensNfeOrdemServico(params: {
	idempresa: string;
	idordemservico: string;
	config: ConfiguracaoOrdemServico;
	ufCliente?: string | null;
}): Promise<{
	itens: ItemPayloadNfe[];
	pendencias: string[];
	itensServicoIgnorados: number;
}> {
	const itensOs = await listarItensPorOrdemServico(
		params.idordemservico,
		params.idempresa,
	);
	const pendencias: string[] = [];
	const itens: ItemPayloadNfe[] = [];
	let itensServicoIgnorados = 0;

	const fiscal = await buscarEmpresaFiscalPorEmpresa(params.idempresa);
	const externa =
		!!fiscal?.uf &&
		!!params.ufCliente &&
		fiscal.uf.toUpperCase() !== params.ufCliente.toUpperCase();

	for (const [index, itemOs] of itensOs.entries()) {
		const rotulo = `Item ${index + 1}`;
		if (itemOs.cancelado === 1) continue;

		if (!itemOs.idproduto) {
			pendencias.push(`${rotulo}: produto não vinculado`);
			continue;
		}

		const produto = await buscarProdutoPorId(itemOs.idproduto);
		if (!produto || produto.idempresa !== params.idempresa) {
			pendencias.push(`${rotulo}: produto não encontrado`);
			continue;
		}

		if (produto.tipo === "S") {
			itensServicoIgnorados++;
			continue;
		}

		const cfopConfig = externa
			? params.config.idcfopexternaproduto
			: params.config.idcfopinternaproduto;

		const codigoCfop = await resolverCodigoCfop([
			itemOs.idcfop,
			cfopConfig,
			produto.idcfopsaida,
			produto.idcfopsaidaexterna,
		]);

		if (!codigoCfop) {
			pendencias.push(`${rotulo}: CFOP de saída não configurado`);
		}

		const quantidade = parseFloat(itemOs.quantidade ?? "0");
		const precoUnitario = parseFloat(itemOs.preco ?? "0");
		const totalItem = parseFloat(itemOs.total ?? "0");
		const valorUnitario =
			precoUnitario > 0
				? precoUnitario
				: quantidade > 0 && totalItem > 0
					? totalItem / quantidade
					: 0;

		if (quantidade <= 0 || valorUnitario <= 0) {
			pendencias.push(`${rotulo}: quantidade ou preço inválido`);
			continue;
		}

		const ncm = await resolverNcmProduto(produto);
		if (!ncm) {
			pendencias.push(`${rotulo}: NCM do produto ausente`);
		}

		const cest = await resolverCestProduto(produto);
		const cst = formatarSituacaoTributaria(produto.situacaotributaria);
		const csosn =
			formatarSituacaoTributaria(produto.tributacaosn) ??
			formatarSituacaoTributaria(produto.situacaotributariasn);

		itens.push({
			idproduto: produto.id,
			...(produto.codigo != null
				? { codigoProduto: String(produto.codigo) }
				: {}),
			descricao:
				itemOs.nomeproduto ??
				produto.descricao ??
				`Produto ${produto.codigo ?? ""}`.trim(),
			ncm,
			...(cest ? { cest } : {}),
			cfop: codigoCfop ?? "",
			unidade: itemOs.unidademedida ?? produto.unidademedida ?? "UN",
			quantidade,
			valorUnitario,
			...(cst ? { cst } : {}),
			...(csosn ? { csosn } : {}),
			orig: produto.origem ?? 0,
		});
	}

	if (itensServicoIgnorados > 0) {
		pendencias.push(
			`${itensServicoIgnorados} item(ns) de serviço ignorado(s) na NF-e modelo 55 (usar NFS-e)`,
		);
	}

	return { itens, pendencias, itensServicoIgnorados };
}
