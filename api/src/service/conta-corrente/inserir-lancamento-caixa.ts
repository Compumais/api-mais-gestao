import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { formatarValorMonetario } from "@/util/recebimentos-venda-util.js";
import * as schema from "../../../drizzle/schema.js";

type TransacaoDb = Parameters<
	Parameters<typeof import("@/repositories/connection.js").db.transaction>[0]
>[0];

export async function inserirLancamentoCaixa(
	tx: TransacaoDb,
	parametros: {
		idcontacorrente: string;
		idusuario: string;
		idplanocontas: string;
		valor: number;
		historico: string;
		documento: string;
		datahora: string;
	},
): Promise<void> {
	const [ultimoLancamento] = await tx
		.select()
		.from(schema.contacorrentelancamento)
		.where(
			eq(
				schema.contacorrentelancamento.idcontacorrente,
				parametros.idcontacorrente,
			),
		)
		.orderBy(
			desc(schema.contacorrentelancamento.datahora),
			desc(schema.contacorrentelancamento.currenttimemillis),
		)
		.limit(1);

	const saldoAnterior = ultimoLancamento?.saldoatual
		? Number(ultimoLancamento.saldoatual)
		: 0;
	const saldoAtual = saldoAnterior + parametros.valor;

	await tx.insert(schema.contacorrentelancamento).values({
		id: uuidv4(),
		idcontacorrente: parametros.idcontacorrente,
		datahora: parametros.datahora,
		tipo: "C",
		valor: formatarValorMonetario(parametros.valor),
		saldoanterior: formatarValorMonetario(saldoAnterior),
		saldoatual: formatarValorMonetario(saldoAtual),
		historico: parametros.historico,
		idusuario: parametros.idusuario,
		idplanocontas: parametros.idplanocontas,
		documento: parametros.documento,
		currenttimemillis: Date.now(),
	});
}
