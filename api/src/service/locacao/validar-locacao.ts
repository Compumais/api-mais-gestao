import type { LinhaLocacaoEntrada } from "@/service/locacao/montar-itens-locacao.js";
import { dataIsoValida, ehPeriodoLocacao } from "@/util/locacao-calculo.js";

export type EntradaLocacao = {
	identidade: string;
	codigo?: string | null;
	datainicio: string;
	cep?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	observacao?: string | null;
	itens: Array<{
		idequipamento: string;
		periodo: string;
		quantidade: number;
	}>;
};

export function textoOpcional(valor: string | null | undefined) {
	const texto = valor?.trim();
	return texto ? texto : null;
}

export function validarEntradaLocacao(
	dados: EntradaLocacao,
): { erro: string } | { linhas: LinhaLocacaoEntrada[] } {
	if (!dataIsoValida(dados.datainicio)) {
		return { erro: "Data de início inválida" };
	}
	if (dados.itens.length === 0) {
		return { erro: "Informe ao menos um equipamento" };
	}
	const vistos = new Set<string>();
	const linhas: LinhaLocacaoEntrada[] = [];
	for (const item of dados.itens) {
		if (!item.idequipamento) {
			return { erro: "Selecione o equipamento de cada item" };
		}
		if (vistos.has(item.idequipamento)) {
			return { erro: "O mesmo equipamento não pode repetir na locação" };
		}
		vistos.add(item.idequipamento);
		if (!ehPeriodoLocacao(item.periodo)) {
			return { erro: "Período da locação inválido" };
		}
		if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
			return {
				erro: "A quantidade de períodos deve ser um inteiro maior que zero",
			};
		}
		linhas.push({
			idequipamento: item.idequipamento,
			periodo: item.periodo,
			quantidade: item.quantidade,
		});
	}
	return { linhas };
}
