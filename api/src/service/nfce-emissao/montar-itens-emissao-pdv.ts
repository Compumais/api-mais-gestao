import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarNcmPorId } from "@/repositories/ncm-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { listarItensPorVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { empresaUsaCsosn } from "@/util/normalizar-tributacao-item-emissao-nfe.js";

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

function formatarSituacaoTributaria(
	valor: string | number | null | undefined,
): string | undefined {
	if (valor == null) return undefined;
	const texto = String(valor).trim().replace(/\D/g, "");
	return texto || undefined;
}

export async function montarItensEmissaoPdv(
	idvenda: string,
	crt?: number | null,
): Promise<{ itens: ItemPayloadNfe[]; pendencias: string[] }> {
	const itensVenda = await listarItensPorVendaPdv(idvenda);
	const pendencias: string[] = [];
	const itens: ItemPayloadNfe[] = [];
	const usaCsosn = empresaUsaCsosn(crt);

	for (const [index, itemVenda] of itensVenda.entries()) {
		const rotulo = `Item ${index + 1}`;

		if (!itemVenda.idproduto) {
			pendencias.push(`${rotulo}: produto não vinculado`);
			continue;
		}

		const produto = await buscarProdutoPorId(itemVenda.idproduto);
		if (!produto) {
			pendencias.push(`${rotulo}: produto não encontrado`);
			continue;
		}

		const codigoCfop = await resolverCodigoCfop([
			produto.idcfopsaidanfce,
			produto.idcfopsaida,
			produto.idcfopsaidaexterna,
		]);

		if (!codigoCfop) {
			pendencias.push(`${rotulo}: CFOP NFC-e não configurado no produto`);
		}

		const quantidade = Number.parseFloat(itemVenda.quantidade ?? "0");
		const precoUnitario = Number.parseFloat(itemVenda.precounitario ?? "0");
		const totalItem = Number.parseFloat(itemVenda.precototal ?? "0");
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

		const cst = formatarSituacaoTributaria(produto.situacaotributaria);
		const csosn =
			formatarSituacaoTributaria(produto.tributacaosn) ??
			formatarSituacaoTributaria(produto.situacaotributariasn);

		// ICMS próprio não entra no payload NFC-e; crédito SN é aplicado depois da normalização.
		itens.push({
			idproduto: produto.id,
			...(produto.codigo != null
				? { codigoProduto: String(produto.codigo) }
				: {}),
			descricao: produto.descricao ?? `Produto ${produto.codigo ?? ""}`.trim(),
			ncm,
			cfop: codigoCfop ?? "5102",
			unidade: produto.unidademedida ?? "UN",
			quantidade,
			valorUnitario,
			...(usaCsosn
				? csosn
					? { csosn }
					: cst
						? { csosn: cst }
						: {}
				: {
						...(cst ? { cst } : {}),
						...(csosn ? { csosn } : {}),
					}),
			orig: produto.origem ?? 0,
		});
	}

	return { itens, pendencias };
}
