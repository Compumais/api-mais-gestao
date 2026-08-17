import type { NotaFiscalItemImportacao } from "@/services/nota-fiscal.service";
import {
	mensagemInconsistenciaCfopEntrada,
	validarCoerenciaCfopEntradaItem,
} from "@/util/cfop-entrada-validacao";

export type CampoPendenciaImportacao = "unidade" | "grupo" | "cfop";

export type ItemPendenciaImportacao = {
	idItem: string;
	contador: number | null;
	descricao: string;
	statusVinculo: "pendente" | "vinculado" | "novo";
	unidadeXml?: string;
	idunidademedida?: string;
	unidadeEstoque?: string;
	idgrupo?: string;
	idcfop?: string;
	cfopXml?: string;
	cfop?: string | null;
	tributacao: {
		icmsst?: string | null;
		situacaotributaria?: string | null;
		icms?: string | null;
	};
	campos: CampoPendenciaImportacao[];
	mensagens: string[];
};

function itemResolvido(statusVinculo: string, idproduto?: string): boolean {
	if (statusVinculo === "vinculado") {
		return Boolean(idproduto);
	}
	return statusVinculo === "novo";
}

export function listarPendenciasCamposImportacao(
	itens: NotaFiscalItemImportacao[],
): ItemPendenciaImportacao[] {
	const pendencias: ItemPendenciaImportacao[] = [];

	for (const item of itens) {
		const dados = item.dadosimportacao;
		if (!dados) {
			continue;
		}

		if (!itemResolvido(dados.statusVinculo, dados.idproduto)) {
			continue;
		}

		const campos: CampoPendenciaImportacao[] = [];
		const mensagens: string[] = [];

		if (dados.statusVinculo === "novo" && !dados.idunidademedida) {
			campos.push("unidade");
			mensagens.push("Informe a unidade de medida");
		}

		if (dados.statusVinculo === "novo" && !dados.idgrupo) {
			campos.push("grupo");
			mensagens.push("Informe o grupo do produto");
		}

		const inconsistenciaCfop = validarCoerenciaCfopEntradaItem({
			idcfop: dados.idcfop,
			codigoCfopEntrada: item.cfop,
			tributacao: dados.tributacao,
		});

		if (inconsistenciaCfop) {
			campos.push("cfop");
			mensagens.push(mensagemInconsistenciaCfopEntrada(inconsistenciaCfop));
		}

		if (campos.length === 0) {
			continue;
		}

		pendencias.push({
			idItem: item.id,
			contador: item.contador,
			descricao:
				dados.descricaoFornecedor ||
				item.descricao ||
				`Item ${item.contador ?? ""}`,
			statusVinculo: dados.statusVinculo,
			unidadeXml: dados.unidadeXml,
			idunidademedida: dados.idunidademedida,
			unidadeEstoque: dados.unidadeEstoque,
			idgrupo: dados.idgrupo,
			idcfop: dados.idcfop,
			cfopXml: dados.cfopXml,
			cfop: item.cfop,
			tributacao: dados.tributacao,
			campos,
			mensagens,
		});
	}

	return pendencias;
}

export function itemPendenciaPreenchido(
	item: Pick<
		ItemPendenciaImportacao,
		"campos" | "idunidademedida" | "idgrupo" | "idcfop" | "cfop" | "tributacao"
	>,
): boolean {
	if (item.campos.includes("unidade") && !item.idunidademedida) {
		return false;
	}
	if (item.campos.includes("grupo") && !item.idgrupo) {
		return false;
	}
	if (item.campos.includes("cfop")) {
		const inconsistencia = validarCoerenciaCfopEntradaItem({
			idcfop: item.idcfop,
			codigoCfopEntrada: item.cfop,
			tributacao: item.tributacao,
		});
		if (inconsistencia) {
			return false;
		}
	}
	return true;
}
