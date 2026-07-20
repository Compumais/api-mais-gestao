import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { listarItensPorDav } from "@/repositories/dav-item-repositories.js";
import { buscarCestPorId } from "@/repositories/cest-repositories.js";
import { buscarNcmPorId } from "@/repositories/ncm-repositories.js";
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
	const cestLegado = normalizarCodigoCest(produto.cest);
	if (cestLegado?.length === 7) {
		return cestLegado;
	}

	if (!produto.idcest) {
		return undefined;
	}

	const cest = await buscarCestPorId(produto.idcest);
	const codigo = normalizarCodigoCest(cest?.codigo);
	return codigo?.length === 7 ? codigo : undefined;
}

function formatarSituacaoTributaria(
	valor: string | number | null | undefined,
): string | undefined {
	if (valor == null) return undefined;
	const texto = String(valor).trim().replace(/\D/g, "");
	return texto || undefined;
}

export type MontarItensEmissaoDavOpcoes = {
	/** Prioriza CFOP de NFC-e (`idcfopsaidanfce`) — pedidos POS. */
	prioridadeNfce?: boolean;
};

export async function montarItensEmissaoDav(
	idempresa: string,
	iddav: string,
	opcoes: MontarItensEmissaoDavOpcoes = {},
): Promise<{ itens: ItemPayloadNfe[]; pendencias: string[] }> {
	const itensDav = await listarItensPorDav(iddav);
	const pendencias: string[] = [];
	const itens: ItemPayloadNfe[] = [];
	const prioridadeNfce = opcoes.prioridadeNfce === true;

	for (const [index, itemDav] of itensDav.entries()) {
		const rotulo = `Item ${index + 1}`;

		if (!itemDav.idproduto) {
			pendencias.push(`${rotulo}: produto não vinculado`);
			continue;
		}

		const produto = await buscarProdutoPorId(itemDav.idproduto);
		if (!produto) {
			pendencias.push(`${rotulo}: produto não encontrado`);
			continue;
		}

		const codigoCfop = await resolverCodigoCfop(
			prioridadeNfce
				? [
						itemDav.idcfop,
						produto.idcfopsaidanfce,
						produto.idcfopsaida,
						produto.idcfopsaidaexterna,
					]
				: [
						itemDav.idcfop,
						produto.idcfopsaida,
						produto.idcfopsaidaexterna,
						produto.idcfopsaidanfce,
					],
		);

		if (!codigoCfop) {
			pendencias.push(
				prioridadeNfce
					? `${rotulo}: CFOP NFC-e não configurado no produto`
					: `${rotulo}: CFOP de saída não configurado`,
			);
		}

		const quantidade = parseFloat(itemDav.quantidade ?? "0");
		const precoUnitario = parseFloat(itemDav.preco ?? "0");
		const totalItem = parseFloat(itemDav.total ?? "0");
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
			descricao: produto.descricao ?? `Produto ${produto.codigo ?? ""}`.trim(),
			ncm,
			...(cest ? { cest } : {}),
			cfop: codigoCfop ?? "",
			unidade: itemDav.unidademedida ?? produto.unidademedida ?? "UN",
			quantidade,
			valorUnitario,
			...(cst ? { cst } : {}),
			...(csosn ? { csosn } : {}),
			orig: produto.origem ?? 0,
		});
	}

	void idempresa;
	return { itens, pendencias };
}
