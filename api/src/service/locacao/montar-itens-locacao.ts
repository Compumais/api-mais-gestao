import { v4 as uuidv4 } from "uuid";
import type { Equipamento } from "@/model/equipamento-model.js";
import type { LocacaoItem, NovoLocacaoItem } from "@/model/locacao-model.js";
import {
	arredondarMoeda,
	calcularItemLocacao,
	moedaLocacao,
	type PeriodoLocacao,
	precoDoPeriodoLocacao,
} from "@/util/locacao-calculo.js";

export type LinhaLocacaoEntrada = {
	idequipamento: string;
	periodo: PeriodoLocacao;
	quantidade: number;
};

export function montarItensLocacao(parametros: {
	idlocacao: string;
	datainicio: string;
	linhas: LinhaLocacaoEntrada[];
	equipamentos: Equipamento[];
	itensAnteriores: LocacaoItem[];
}): { itens: NovoLocacaoItem[]; valorperiodo: number; valortotal: number } {
	const porId = new Map(parametros.equipamentos.map((item) => [item.id, item]));
	let valorperiodo = 0;
	const itens: NovoLocacaoItem[] = parametros.linhas.map((linha) => {
		const equipamento = porId.get(linha.idequipamento);
		if (!equipamento) {
			throw new Error("Equipamento da linha não encontrado");
		}
		const anterior = parametros.itensAnteriores.find(
			(item) =>
				item.idequipamento === linha.idequipamento &&
				item.periodo === linha.periodo,
		);
		const valorunitario = anterior
			? Number(anterior.valorunitario)
			: precoDoPeriodoLocacao(equipamento, linha.periodo);
		const valordiaria = anterior
			? Number(anterior.valordiaria)
			: Number(equipamento.precodiaria);
		const calculo = calcularItemLocacao({
			datainicio: parametros.datainicio,
			periodo: linha.periodo,
			quantidade: linha.quantidade,
			valorunitario,
			valordiaria,
		});
		valorperiodo = arredondarMoeda(valorperiodo + calculo.valorperiodo);
		return {
			id: uuidv4(),
			idlocacao: parametros.idlocacao,
			idequipamento: linha.idequipamento,
			periodo: linha.periodo,
			quantidade: linha.quantidade,
			valorunitario: moedaLocacao(valorunitario),
			valordiaria: moedaLocacao(valordiaria),
			dataprevista: calculo.dataprevista,
			valorperiodo: moedaLocacao(calculo.valorperiodo),
			valormora: moedaLocacao(0),
			valortotal: moedaLocacao(calculo.valortotal),
			diasatraso: 0,
		};
	});

	return { itens, valorperiodo, valortotal: valorperiodo };
}
