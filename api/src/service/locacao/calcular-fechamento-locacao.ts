import type { LocacaoItem } from "@/model/locacao-model.js";
import {
	arredondarMoeda,
	calcularItemLocacao,
	ehPeriodoLocacao,
	moedaLocacao,
} from "@/util/locacao-calculo.js";

export type PreviaItemLocacao = {
	id: string;
	idequipamento: string;
	codigoequipamento: string;
	descricaoequipamento: string;
	periodo: string;
	quantidade: number;
	dataprevista: string;
	diasatraso: number;
	valorperiodo: string;
	valormora: string;
	valortotal: string;
};

export type PreviaFechamentoLocacao = {
	datadevolucao: string;
	valorperiodo: string;
	valormora: string;
	valortotal: string;
	itens: PreviaItemLocacao[];
};

export function calcularFechamentoLocacao(parametros: {
	datainicio: string;
	datadevolucao: string;
	itens: Array<{
		item: LocacaoItem;
		codigoequipamento: string;
		descricaoequipamento: string;
	}>;
}): PreviaFechamentoLocacao {
	let valorperiodo = 0;
	let valormora = 0;
	const itens = parametros.itens.map((linha) => {
		if (!ehPeriodoLocacao(linha.item.periodo)) {
			throw new Error("Período gravado na locação é inválido");
		}
		const calculo = calcularItemLocacao({
			datainicio: parametros.datainicio,
			periodo: linha.item.periodo,
			quantidade: linha.item.quantidade,
			valorunitario: Number(linha.item.valorunitario),
			valordiaria: Number(linha.item.valordiaria),
			datadevolucao: parametros.datadevolucao,
		});
		valorperiodo = arredondarMoeda(valorperiodo + calculo.valorperiodo);
		valormora = arredondarMoeda(valormora + calculo.valormora);
		return {
			id: linha.item.id,
			idequipamento: linha.item.idequipamento,
			codigoequipamento: linha.codigoequipamento,
			descricaoequipamento: linha.descricaoequipamento,
			periodo: linha.item.periodo,
			quantidade: linha.item.quantidade,
			dataprevista: calculo.dataprevista,
			diasatraso: calculo.diasatraso,
			valorperiodo: moedaLocacao(calculo.valorperiodo),
			valormora: moedaLocacao(calculo.valormora),
			valortotal: moedaLocacao(calculo.valortotal),
		};
	});

	return {
		datadevolucao: parametros.datadevolucao,
		valorperiodo: moedaLocacao(valorperiodo),
		valormora: moedaLocacao(valormora),
		valortotal: moedaLocacao(arredondarMoeda(valorperiodo + valormora)),
		itens,
	};
}
