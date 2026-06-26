import type {
	DadosContribuinteSintegra,
	InventarioSintegra,
	ItemNotaSintegra,
	NotaSintegra,
	ResultadoValidacaoSintegra,
} from "./tipos-sintegra.js";

const UF_ESPERADA = "MG";

function parseNumero(valor: string | null | undefined): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

export function validarDadosSintegra({
	contribuinte,
	notas,
	itens,
	inventario,
	incluirInventario,
}: {
	contribuinte: DadosContribuinteSintegra | null;
	notas: NotaSintegra[];
	itens: ItemNotaSintegra[];
	inventario: InventarioSintegra[];
	incluirInventario?: boolean;
}): ResultadoValidacaoSintegra {
	const erros: string[] = [];
	const alertas: string[] = [];

	if (!contribuinte) {
		erros.push("Configuração fiscal da empresa não encontrada (empresafiscal).");
		return { erros, alertas };
	}

	if (!contribuinte.cnpj?.replace(/\D/g, "")) {
		erros.push("CNPJ do contribuinte não informado.");
	}

	if (!contribuinte.inscricaoEstadual?.trim()) {
		erros.push("Inscrição estadual do contribuinte não informada.");
	}

	if (contribuinte.uf && contribuinte.uf.toUpperCase() !== UF_ESPERADA) {
		alertas.push(
			`UF configurada (${contribuinte.uf}) difere da UF alvo do layout (${UF_ESPERADA}).`,
		);
	}

	if (!contribuinte.municipio?.trim()) {
		alertas.push(
			"Município não configurado na empresa fiscal. O registro 10 usará código IBGE.",
		);
	}

	if (notas.length === 0) {
		alertas.push("Nenhuma nota fiscal encontrada no período informado.");
	}

	const notasSemParticipante = notas.filter(
		(nota) => !nota.cnpjCpf?.replace(/\D/g, ""),
	);
	if (notasSemParticipante.length > 0) {
		alertas.push(
			`${notasSemParticipante.length} nota(s) sem CNPJ/CPF do participante.`,
		);
	}

	const itensSemProduto = itens.filter((item) => !item.codigoProduto?.trim());
	if (itensSemProduto.length > 0) {
		alertas.push(`${itensSemProduto.length} item(ns) sem código de produto.`);
	}

	const itensSemCfop = itens.filter((item) => !item.cfop?.replace(/\D/g, ""));
	if (itensSemCfop.length > 0) {
		alertas.push(`${itensSemCfop.length} item(ns) sem CFOP.`);
	}

	if (incluirInventario && inventario.length === 0) {
		alertas.push(
			"Inventário solicitado, porém não há registros na data informada. Será usado snapshot de estoque fiscal com custo estimado.",
		);
	}

	for (const item of inventario) {
		if (parseNumero(item.quantidade) <= 0 || parseNumero(item.valorTotal) <= 0) {
			alertas.push(
				`Item de inventário ${item.codigoProduto} com quantidade ou valor inválido.`,
			);
		}
	}

	alertas.push(
		"Registro 60 (ECF) não gerado: o ERP não possui integração com redução Z/PAF.",
	);

	return { erros, alertas };
}

export function validarPeriodo(dataInicio: string, dataFim: string): string | null {
	const inicio = new Date(dataInicio);
	const fim = new Date(dataFim);

	if (inicio > fim) {
		return "Data inicial não pode ser maior que data final";
	}

	const diffTime = Math.abs(fim.getTime() - inicio.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays > 365) {
		return "Período máximo permitido é de 365 dias";
	}

	return null;
}
