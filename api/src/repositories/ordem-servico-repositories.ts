import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoOrdemServico } from "@/model/ordem-servico-model";
import { ordemservico } from "@/repositories/schema.js";
import { db } from "./connection";

export const ORDENAR_ORDENS_SERVICO_CAMPOS = [
	"codigo",
	"cliente",
	"cnpjcpfcliente",
	"data",
	"status",
	"valor",
	"orcamento",
	"tecnico",
	"atendente",
	"objeto",
	"area",
	"tipoproblema",
	"agendamento",
	"previsaoconclusao",
	"dataultimoevento",
	"problemadescrito",
	"laudotecnico",
	"observacao",
	"descricaotipoultimoevento",
	"descricaoultimoevento",
	"valorprodutos",
	"valorservicos",
	"descontosubtotal",
	"geroufinanceiro",
	"faturouparanota",
	"faturouparacupom",
	"placa",
	"marca",
	"modelo",
	"renavam",
	"extra1",
	"extra2",
	"extra3",
	"extra4",
	"extra5",
	"extra6",
	"extra7",
	"extra8",
	"extra9",
	"extra10",
	"extra11",
	"extra12",
	"extra13",
	"extra14",
	"extra15",
	"extra16",
] as const;

export type OrdenarOrdensServicoCampo =
	(typeof ORDENAR_ORDENS_SERVICO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: ordemservico.codigo,
	cliente: ordemservico.nomecliente,
	cnpjcpfcliente: ordemservico.cnpjcpfcliente,
	data: ordemservico.dataos,
	status: ordemservico.status,
	valor: ordemservico.valor,
	orcamento: ordemservico.orcamento,
	tecnico: ordemservico.idultimotecnico,
	atendente: ordemservico.idatendente,
	objeto: ordemservico.idobjeto,
	area: ordemservico.idarea,
	tipoproblema: ordemservico.idtipoproblema,
	agendamento: ordemservico.agendamento,
	previsaoconclusao: ordemservico.previsaoconclusao,
	dataultimoevento: ordemservico.dataultimoevento,
	problemadescrito: ordemservico.problemadescrito,
	laudotecnico: ordemservico.laudotecnico,
	observacao: ordemservico.observacao,
	descricaotipoultimoevento: ordemservico.descricaotipoultimoevento,
	descricaoultimoevento: ordemservico.descricaoultimoevento,
	valorprodutos: ordemservico.valorprodutos,
	valorservicos: ordemservico.valorservicos,
	descontosubtotal: ordemservico.descontosubtotal,
	geroufinanceiro: ordemservico.geroufinanceiro,
	faturouparanota: ordemservico.faturouparanota,
	faturouparacupom: ordemservico.faturouparacupom,
	placa: ordemservico.placa,
	marca: ordemservico.marca,
	modelo: ordemservico.modelo,
	renavam: ordemservico.renavam,
	extra1: ordemservico.extra1,
	extra2: ordemservico.extra2,
	extra3: ordemservico.extra3,
	extra4: ordemservico.extra4,
	extra5: ordemservico.extra5,
	extra6: ordemservico.extra6,
	extra7: ordemservico.extra7,
	extra8: ordemservico.extra8,
	extra9: ordemservico.extra9,
	extra10: ordemservico.extra10,
	extra11: ordemservico.extra11,
	extra12: ordemservico.extra12,
	extra13: ordemservico.extra13,
	extra14: ordemservico.extra14,
	extra15: ordemservico.extra15,
	extra16: ordemservico.extra16,
} as const;

function filtroDataDia(
	coluna:
		| typeof ordemservico.agendamento
		| typeof ordemservico.dataultimoevento,
	data: string,
) {
	return and(
		gte(coluna, `${data}T00:00:00.000`),
		lte(coluna, `${data}T23:59:59.999`),
	);
}

export async function buscarOrdemServicoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(ordemservico)
		.where(eq(ordemservico.id, id));

	return registro;
}

export async function buscarOrdemServicoPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(ordemservico)
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)));

	return registro;
}

export async function criarOrdemServico(dadosOrdemServico: NovoOrdemServico) {
	const [registro] = await db
		.insert(ordemservico)
		.values(dadosOrdemServico)
		.returning();

	return registro;
}

export async function atualizarOrdemServico(
	id: string,
	idempresa: string,
	dadosOrdemServico: Partial<NovoOrdemServico>,
) {
	const [registro] = await db
		.update(ordemservico)
		.set({
			...dadosOrdemServico,
			currenttimemillis: Date.now(),
		})
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)))
		.returning();

	return registro;
}

export async function excluirOrdemServico(id: string, idempresa: string) {
	const [registro] = await db
		.delete(ordemservico)
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)))
		.returning();

	return registro;
}

export type ListarOrdensServicoParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
	status?: number | undefined;
	idcliente?: string | undefined;
	idultimotecnico?: string | undefined;
	idatendente?: string | undefined;
	idobjeto?: string | undefined;
	idarea?: string | undefined;
	idtipoproblema?: string | undefined;
	codigo?: number | undefined;
	orcamento?: number | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	busca?: string | undefined;
	cnpjcpfcliente?: string | undefined;
	geroufinanceiro?: number | undefined;
	faturouparanota?: number | undefined;
	faturouparacupom?: number | undefined;
	agendamento?: string | undefined;
	previsaoconclusao?: string | undefined;
	dataultimoevento?: string | undefined;
	problemadescrito?: string | undefined;
	laudotecnico?: string | undefined;
	observacao?: string | undefined;
	descricaotipoultimoevento?: string | undefined;
	descricaoultimoevento?: string | undefined;
	placa?: string | undefined;
	marca?: string | undefined;
	modelo?: string | undefined;
	renavam?: string | undefined;
	extra1?: string | undefined;
	extra2?: string | undefined;
	extra3?: string | undefined;
	extra4?: string | undefined;
	extra5?: string | undefined;
	extra6?: string | undefined;
	extra7?: string | undefined;
	extra8?: string | undefined;
	extra9?: string | undefined;
	extra10?: string | undefined;
	extra11?: string | undefined;
	extra12?: string | undefined;
	extra13?: string | undefined;
	extra14?: string | undefined;
	extra15?: string | undefined;
	extra16?: string | undefined;
	ordenarPor?: OrdenarOrdensServicoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
};

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function listarOrdensServico({
	idempresa,
	page = 1,
	limit = 10,
	status,
	idcliente,
	idultimotecnico,
	idatendente,
	idobjeto,
	idarea,
	idtipoproblema,
	codigo,
	orcamento,
	dataInicio,
	dataFim,
	busca,
	cnpjcpfcliente,
	geroufinanceiro,
	faturouparanota,
	faturouparacupom,
	agendamento,
	previsaoconclusao,
	dataultimoevento,
	problemadescrito,
	laudotecnico,
	observacao,
	descricaotipoultimoevento,
	descricaoultimoevento,
	placa,
	marca,
	modelo,
	renavam,
	extra1,
	extra2,
	extra3,
	extra4,
	extra5,
	extra6,
	extra7,
	extra8,
	extra9,
	extra10,
	extra11,
	extra12,
	extra13,
	extra14,
	extra15,
	extra16,
	ordenarPor,
	ordem = "desc",
}: ListarOrdensServicoParametros) {
	const where: SQL[] = [eq(ordemservico.idempresa, idempresa)];

	if (status !== undefined) {
		where.push(eq(ordemservico.status, status));
	}
	if (idcliente) {
		where.push(eq(ordemservico.idcliente, idcliente));
	}
	if (idultimotecnico) {
		where.push(eq(ordemservico.idultimotecnico, idultimotecnico));
	}
	if (idatendente) {
		where.push(eq(ordemservico.idatendente, idatendente));
	}
	if (idobjeto) {
		where.push(eq(ordemservico.idobjeto, idobjeto));
	}
	if (idarea) {
		where.push(eq(ordemservico.idarea, idarea));
	}
	if (idtipoproblema) {
		where.push(eq(ordemservico.idtipoproblema, idtipoproblema));
	}
	if (codigo !== undefined) {
		where.push(eq(ordemservico.codigo, codigo));
	}
	if (orcamento !== undefined) {
		where.push(eq(ordemservico.orcamento, orcamento));
	}
	if (dataInicio) {
		where.push(gte(ordemservico.dataos, dataInicio));
	}
	if (dataFim) {
		where.push(lte(ordemservico.dataos, dataFim));
	}
	if (busca) {
		where.push(ilike(ordemservico.nomecliente, `%${busca}%`));
	}
	adicionarFiltroTexto(where, ordemservico.cnpjcpfcliente, cnpjcpfcliente);
	if (geroufinanceiro !== undefined) {
		where.push(eq(ordemservico.geroufinanceiro, geroufinanceiro));
	}
	if (faturouparanota !== undefined) {
		where.push(eq(ordemservico.faturouparanota, faturouparanota));
	}
	if (faturouparacupom !== undefined) {
		where.push(eq(ordemservico.faturouparacupom, faturouparacupom));
	}
	if (agendamento) {
		const condicao = filtroDataDia(ordemservico.agendamento, agendamento);
		if (condicao) where.push(condicao);
	}
	if (previsaoconclusao) {
		where.push(eq(ordemservico.previsaoconclusao, previsaoconclusao));
	}
	if (dataultimoevento) {
		const condicao = filtroDataDia(
			ordemservico.dataultimoevento,
			dataultimoevento,
		);
		if (condicao) where.push(condicao);
	}
	adicionarFiltroTexto(where, ordemservico.problemadescrito, problemadescrito);
	adicionarFiltroTexto(where, ordemservico.laudotecnico, laudotecnico);
	adicionarFiltroTexto(where, ordemservico.observacao, observacao);
	adicionarFiltroTexto(
		where,
		ordemservico.descricaotipoultimoevento,
		descricaotipoultimoevento,
	);
	adicionarFiltroTexto(
		where,
		ordemservico.descricaoultimoevento,
		descricaoultimoevento,
	);
	adicionarFiltroTexto(where, ordemservico.placa, placa);
	adicionarFiltroTexto(where, ordemservico.marca, marca);
	adicionarFiltroTexto(where, ordemservico.modelo, modelo);
	adicionarFiltroTexto(where, ordemservico.renavam, renavam);
	adicionarFiltroTexto(where, ordemservico.extra1, extra1);
	adicionarFiltroTexto(where, ordemservico.extra2, extra2);
	adicionarFiltroTexto(where, ordemservico.extra3, extra3);
	adicionarFiltroTexto(where, ordemservico.extra4, extra4);
	adicionarFiltroTexto(where, ordemservico.extra5, extra5);
	adicionarFiltroTexto(where, ordemservico.extra6, extra6);
	adicionarFiltroTexto(where, ordemservico.extra7, extra7);
	adicionarFiltroTexto(where, ordemservico.extra8, extra8);
	adicionarFiltroTexto(where, ordemservico.extra9, extra9);
	adicionarFiltroTexto(where, ordemservico.extra10, extra10);
	adicionarFiltroTexto(where, ordemservico.extra11, extra11);
	adicionarFiltroTexto(where, ordemservico.extra12, extra12);
	adicionarFiltroTexto(where, ordemservico.extra13, extra13);
	adicionarFiltroTexto(where, ordemservico.extra14, extra14);
	adicionarFiltroTexto(where, ordemservico.extra15, extra15);
	adicionarFiltroTexto(where, ordemservico.extra16, extra16);

	const offset = (page - 1) * limit;

	const colunaOrdenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? COLUNAS_ORDENACAO[ordenarPor]
			: ordemservico.currenttimemillis;
	const ordenacao =
		ordem === "asc" ? asc(colunaOrdenacao) : desc(colunaOrdenacao);

	const [totalCount, ordenservicos] = await Promise.all([
		db
			.select({ value: count() })
			.from(ordemservico)
			.where(and(...where)),
		db
			.select()
			.from(ordemservico)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		ordenservicos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function recalcularTotaisOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	const result = await db.execute<{
		valorprodutos: string | null;
		valorservicos: string | null;
		valor: string | null;
	}>(sql`
		SELECT
			COALESCE(SUM(CASE WHEN p.tipo = 'S' THEN CAST(i.total AS numeric) ELSE 0 END), 0)::text AS valorservicos,
			COALESCE(SUM(CASE WHEN COALESCE(p.tipo, 'P') <> 'S' THEN CAST(i.total AS numeric) ELSE 0 END), 0)::text AS valorprodutos,
			COALESCE(SUM(CAST(i.total AS numeric)), 0)::text AS valor
		FROM ordemservicoitem i
		LEFT JOIN produtos p ON p.id = i.idproduto
		WHERE i.idordemservico = ${idordemservico}
			AND i.idempresa = ${idempresa}
			AND COALESCE(i.cancelado, 0) = 0
	`);

	const totais = result.rows[0];

	return atualizarOrdemServico(idordemservico, idempresa, {
		valorprodutos: totais?.valorprodutos ?? "0.00",
		valorservicos: totais?.valorservicos ?? "0.00",
		valor: totais?.valor ?? "0.00",
	});
}
