import {
	ORIGEM_TIPO_APROPRIACAO,
	REGIME_APROPRIACAO,
} from "@/constants/centro-custo.js";
import type { LinhaApropriacaoInput } from "@/model/apropriacao-centro-custo-model.js";
import { listarApropriacoesPorOrigem } from "@/repositories/apropriacao-centro-custo-repositories.js";
import { salvarApropriacoesCentroCustoService } from "./salvar-apropriacoes-centro-custo.js";

export async function aplicarApropriacaoFinanceiroCompetencia({
	idusuario,
	idempresa,
	idfinanceiro,
	linhas,
	idcriteriorateio,
}: {
	idusuario: string;
	idempresa: string;
	idfinanceiro: string;
	linhas?: LinhaApropriacaoInput[];
	idcriteriorateio?: string | null;
}) {
	if (!linhas?.length) return null;
	return salvarApropriacoesCentroCustoService({
		idusuario,
		idempresa,
		origemtipo: ORIGEM_TIPO_APROPRIACAO.FINANCEIRO,
		origemid: idfinanceiro,
		regime: REGIME_APROPRIACAO.COMPETENCIA,
		linhas,
		idcriteriorateio,
	});
}

export async function aplicarApropriacaoUnicaCentroFinanceiro({
	idusuario,
	idempresa,
	idfinanceiro,
	idcentrocusto,
}: {
	idusuario: string;
	idempresa: string;
	idfinanceiro: string;
	idcentrocusto: string;
}) {
	return aplicarApropriacaoFinanceiroCompetencia({
		idusuario,
		idempresa,
		idfinanceiro,
		linhas: [{ idcentrocusto, percentual: 100 }],
	});
}

export async function aplicarApropriacaoBaixaFinanceiroCaixa({
	idusuario,
	idempresa,
	idfinanceirolancamento,
	idfinanceiro,
	valorBaixa,
}: {
	idusuario: string;
	idempresa: string;
	idfinanceirolancamento: string;
	idfinanceiro: string;
	valorBaixa: number;
}) {
	const linhasCompetencia = await listarApropriacoesPorOrigem({
		idempresa,
		origemtipo: ORIGEM_TIPO_APROPRIACAO.FINANCEIRO,
		origemid: idfinanceiro,
		regime: REGIME_APROPRIACAO.COMPETENCIA,
	});
	if (!linhasCompetencia.length) return null;

	const totalCompetencia = linhasCompetencia.reduce(
		(acc, l) => acc + Number(l.valor),
		0,
	);
	if (totalCompetencia <= 0) return null;

	return salvarApropriacoesCentroCustoService({
		idusuario,
		idempresa,
		origemtipo: ORIGEM_TIPO_APROPRIACAO.FINANCEIRO_LANCAMENTO,
		origemid: idfinanceirolancamento,
		regime: REGIME_APROPRIACAO.CAIXA,
		valorTotalManual: valorBaixa,
		linhas: linhasCompetencia.map((linha) => ({
			idcentrocusto: linha.idcentrocusto,
			valor: (Number(linha.valor) / totalCompetencia) * valorBaixa,
		})),
	});
}

export async function aplicarApropriacaoContaCorrenteCaixa({
	idusuario,
	idempresa,
	idlancamento,
	linhas,
	idcriteriorateio,
}: {
	idusuario: string;
	idempresa: string;
	idlancamento: string;
	linhas?: LinhaApropriacaoInput[];
	idcriteriorateio?: string | null;
}) {
	if (!linhas?.length) return null;
	return salvarApropriacoesCentroCustoService({
		idusuario,
		idempresa,
		origemtipo: ORIGEM_TIPO_APROPRIACAO.CONTA_CORRENTE_LANCAMENTO,
		origemid: idlancamento,
		regime: REGIME_APROPRIACAO.CAIXA,
		linhas,
		idcriteriorateio,
	});
}
