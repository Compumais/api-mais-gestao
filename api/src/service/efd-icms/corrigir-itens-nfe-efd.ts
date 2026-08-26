import { buscarEmpresaPorCnpj } from "@/repositories/empresa-repositories.js";
import {
	atualizarItemNotaFiscal,
	listarItensPorNotaFiscal,
	listarNotasFiscaisPorNumeros,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarProdutoPorCodigoOuEan,
	buscarProdutoPorNomeOuDescricao,
} from "@/repositories/produtos-repositories.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";

export function descricaoProdutoSemLote(texto: string): string {
	return texto
		.replace(/\blote\b[\s\S]*$/i, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function cProdEhPlaceholderSequencial(
	cProd: string,
	nItem: number,
): boolean {
	return cProd === String(nItem).padStart(6, "0");
}

function expandirNumerosNota(numeros: string[]): string[] {
	const unicos = new Set<string>();
	for (const numero of numeros) {
		const limpo = numero.replace(/\D/g, "");
		if (!limpo) continue;
		const semZeros = String(Number.parseInt(limpo, 10));
		unicos.add(limpo);
		unicos.add(semZeros);
		unicos.add(limpo.padStart(6, "0"));
		unicos.add(limpo.padStart(9, "0"));
		unicos.add(semZeros.padStart(6, "0"));
		unicos.add(semZeros.padStart(9, "0"));
	}
	return [...unicos];
}

function preferirValorFiscal(
	atual: string | null | undefined,
	xml: string | undefined,
): string | null {
	const valorXml = Number(xml ?? 0);
	if (valorXml > 0) return xml ?? null;
	const valorAtual = Number(atual ?? 0);
	if (valorAtual > 0) return atual ?? null;
	return xml ?? atual ?? null;
}

export type CorrecaoItemEfd = {
	idItem: string;
	numeroNota: string;
	contador: number;
	descricao: string;
	idproduto: string | null;
	produto: string | null;
	baseicmsst: string | null;
	valoricmsst: string | null;
	aliquotaicmsst: string | null;
	motivo: string;
};

export async function corrigirItensNfeParaEfd(params: {
	cnpj: string;
	numeros: string[];
	aplicar: boolean;
}): Promise<CorrecaoItemEfd[]> {
	const empresaReg = await buscarEmpresaPorCnpj(params.cnpj);
	if (!empresaReg) {
		throw new Error(
			`Empresa com CNPJ ${params.cnpj.replace(/\D/g, "")} não encontrada.`,
		);
	}

	const notas = await listarNotasFiscaisPorNumeros(
		empresaReg.id,
		expandirNumerosNota(params.numeros),
	);
	const notasProducao = notas.filter(
		(nota) =>
			nota.modelo !== "65" &&
			nota.tipoambientenfe !== 2 &&
			params.numeros.some((numero) => {
				const pedido = String(Number.parseInt(numero.replace(/\D/g, ""), 10));
				const atual = String(
					Number.parseInt(
						(nota.numero ?? nota.numeronotafiscal ?? "").replace(/\D/g, "") ||
							"NaN",
						10,
					),
				);
				return pedido === atual;
			}),
	);

	if (notasProducao.length === 0) {
		throw new Error(
			`Nenhuma NF-e de produção ${params.numeros.join(", ")} encontrada para o CNPJ informado.`,
		);
	}

	const correcoes: CorrecaoItemEfd[] = [];

	for (const nota of notasProducao) {
		const xml = await obterXmlAutorizadoNotaFiscal(nota.id);
		if (!xml) {
			throw new Error(
				`NF ${nota.numero ?? nota.numeronotafiscal} sem XML autorizado gravado. Não dá para recuperar ST/cProd.`,
			);
		}

		const parsed = parseNFeXml(xml);
		const itensXml = parsed.itens ?? [];
		const itensNota = await listarItensPorNotaFiscal(nota.id);
		const numeroNota = nota.numero ?? nota.numeronotafiscal ?? "";

		for (const item of itensNota) {
			const nItem = item.contador ?? 1;
			const itemXml = itensXml[nItem - 1];
			if (!itemXml) {
				correcoes.push({
					idItem: item.id,
					numeroNota,
					contador: nItem,
					descricao: item.descricao ?? "",
					idproduto: item.idproduto,
					produto: item.produto,
					baseicmsst: item.baseicmsst,
					valoricmsst: item.valoricmsst,
					aliquotaicmsst: item.aliquotaicmsst,
					motivo: "Sem item correspondente no XML",
				});
				continue;
			}

			const cProd =
				itemXml.referenciafornecedor?.trim() ||
				(itemXml.codigoproduto != null ? String(itemXml.codigoproduto) : "");

			const produto = await localizarProdutoCadastro({
				idempresa: empresaReg.id,
				cProd,
				nItem,
				descricaoXml: itemXml.descricaoproduto,
				descricaoItem: item.descricao ?? "",
			});

			const codigoCadastro =
				produto?.codigo != null
					? String(produto.codigo)
					: !cProdEhPlaceholderSequencial(cProd, nItem) && cProd
						? cProd.replace(/^0+/, "") || cProd
						: null;

			const patch = {
				idproduto: item.idproduto ?? produto?.id ?? null,
				produto: item.produto?.trim() || codigoCadastro,
				baseicmsst: preferirValorFiscal(item.baseicmsst, itemXml.baseicmsst),
				valoricmsst: preferirValorFiscal(item.valoricmsst, itemXml.icmsst),
				aliquotaicmsst: preferirValorFiscal(
					item.aliquotaicmsst,
					itemXml.aliquotaicmsst,
				),
			};

			const motivo = [
				produto
					? `produto ${produto.codigo ?? produto.id}`
					: "produto não encontrado no cadastro",
				patch.valoricmsst && Number(patch.valoricmsst) > 0
					? `ST ${patch.valoricmsst}`
					: "sem ST no XML",
			].join("; ");

			if (params.aplicar) {
				await atualizarItemNotaFiscal(item.id, patch);
			}

			correcoes.push({
				idItem: item.id,
				numeroNota,
				contador: nItem,
				descricao: item.descricao ?? "",
				idproduto: patch.idproduto,
				produto: patch.produto,
				baseicmsst: patch.baseicmsst,
				valoricmsst: patch.valoricmsst,
				aliquotaicmsst: patch.aliquotaicmsst,
				motivo,
			});
		}
	}

	return correcoes;
}

async function localizarProdutoCadastro(params: {
	idempresa: string;
	cProd: string;
	nItem: number;
	descricaoXml: string;
	descricaoItem: string;
}) {
	if (
		params.cProd &&
		!cProdEhPlaceholderSequencial(params.cProd, params.nItem)
	) {
		const codigo = Number.parseInt(params.cProd.replace(/^0+/, "") || "0", 10);
		if (Number.isFinite(codigo) && codigo > 0) {
			const porCodigo = await buscarProdutoPorCodigoOuEan(
				params.idempresa,
				codigo,
			);
			if (porCodigo) return porCodigo;
		}
	}

	const candidatos = [
		descricaoProdutoSemLote(params.descricaoXml),
		descricaoProdutoSemLote(params.descricaoItem),
	].filter((texto) => texto.length >= 4);

	for (const termo of [...new Set(candidatos)]) {
		const porNome = await buscarProdutoPorNomeOuDescricao(
			params.idempresa,
			termo,
		);
		if (porNome) return porNome;
	}

	return null;
}
