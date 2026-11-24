import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	type SQL,
} from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model.js";
import type {
	Locacao,
	NovaLocacao,
	NovoLocacaoItem,
} from "@/model/locacao-model.js";
import {
	entidade,
	equipamento,
	financeiro,
	locacao,
	locacaoitem,
} from "@/repositories/schema.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { ErroNegocioLocacao } from "@/util/locacao-erro.js";
import { db } from "./connection.js";

export async function buscarLocacaoPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select({
			locacao,
			nomecliente: entidade.nome,
			razaosocial: entidade.razaosocial,
		})
		.from(locacao)
		.innerJoin(entidade, eq(locacao.identidade, entidade.id))
		.where(and(eq(locacao.id, id), eq(locacao.idempresa, idempresa)));
	return registro;
}

export async function buscarLocacaoPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const [registro] = await db
		.select()
		.from(locacao)
		.where(and(eq(locacao.idempresa, idempresa), eq(locacao.codigo, codigo)));
	return registro;
}

export async function listarItensLocacao(idlocacao: string) {
	return db
		.select({
			item: locacaoitem,
			codigoequipamento: equipamento.codigo,
			descricaoequipamento: equipamento.descricao,
			numeroserie: equipamento.numeroserie,
		})
		.from(locacaoitem)
		.innerJoin(equipamento, eq(locacaoitem.idequipamento, equipamento.id))
		.where(eq(locacaoitem.idlocacao, idlocacao))
		.orderBy(equipamento.codigo);
}

export async function contarItensPorEquipamento(idequipamento: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(locacaoitem)
		.where(eq(locacaoitem.idequipamento, idequipamento));
	return resultado?.value ?? 0;
}

export type ListarLocacoesParametros = {
	idempresa: string;
	codigo?: string;
	situacao?: string;
	identidade?: string;
	page?: number;
	limit?: number;
};

export async function listarLocacoes({
	idempresa,
	codigo,
	situacao,
	identidade,
	page = 1,
	limit = 20,
}: ListarLocacoesParametros) {
	const where: SQL[] = [eq(locacao.idempresa, idempresa)];
	if (codigo?.trim()) {
		where.push(ilike(locacao.codigo, `%${codigo.trim()}%`));
	}
	if (situacao?.trim()) {
		where.push(eq(locacao.situacao, situacao.trim()));
	}
	if (identidade?.trim()) {
		where.push(eq(locacao.identidade, identidade.trim()));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);
	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(locacao).where(filtro),
		db
			.select({
				locacao,
				nomecliente: entidade.nome,
				razaosocial: entidade.razaosocial,
			})
			.from(locacao)
			.innerJoin(entidade, eq(locacao.identidade, entidade.id))
			.where(filtro)
			.orderBy(desc(locacao.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		locacoes: registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarLocacoesAbertasParaMapa(idempresa: string) {
	const registros = await db
		.select({
			locacao,
			nomecliente: entidade.nome,
			razaosocial: entidade.razaosocial,
		})
		.from(locacao)
		.innerJoin(entidade, eq(locacao.identidade, entidade.id))
		.where(
			and(eq(locacao.idempresa, idempresa), eq(locacao.situacao, "aberta")),
		)
		.orderBy(asc(locacao.codigo));

	if (registros.length === 0) return [];

	const itens = await db
		.select({
			idlocacao: locacaoitem.idlocacao,
			codigoequipamento: equipamento.codigo,
			descricaoequipamento: equipamento.descricao,
			numeroserie: equipamento.numeroserie,
		})
		.from(locacaoitem)
		.innerJoin(equipamento, eq(locacaoitem.idequipamento, equipamento.id))
		.where(
			inArray(
				locacaoitem.idlocacao,
				registros.map((registro) => registro.locacao.id),
			),
		)
		.orderBy(asc(equipamento.codigo));

	return registros.map((registro) => ({
		...registro,
		equipamentos: itens.filter((item) => item.idlocacao === registro.locacao.id),
	}));
}

async function alocarEquipamentos(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	idempresa: string,
	ids: string[],
	agora: string,
) {
	for (const id of ids) {
		const [atualizado] = await tx
			.update(equipamento)
			.set({ situacao: "alocado", atualizadoem: agora })
			.where(
				and(
					eq(equipamento.id, id),
					eq(equipamento.idempresa, idempresa),
					eq(equipamento.situacao, "disponivel"),
				),
			)
			.returning({ id: equipamento.id });

		if (atualizado) continue;

		const [atual] = await tx
			.select({
				codigo: equipamento.codigo,
				descricao: equipamento.descricao,
			})
			.from(equipamento)
			.where(eq(equipamento.id, id));

		throw new ErroNegocioLocacao(
			atual
				? `Equipamento ${atual.codigo} - ${atual.descricao} não está disponível`
				: "Equipamento não encontrado",
		);
	}
}

async function liberarEquipamentos(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	ids: string[],
	agora: string,
) {
	if (ids.length === 0) return;
	await tx
		.update(equipamento)
		.set({ situacao: "disponivel", atualizadoem: agora })
		.where(
			and(inArray(equipamento.id, ids), eq(equipamento.situacao, "alocado")),
		);
}

export async function salvarLocacaoAberta(parametros: {
	locacao: NovaLocacao;
	itens: NovoLocacaoItem[];
	idsEquipamentosAlocar: string[];
	idsEquipamentosLiberar: string[];
	modo: "criar" | "atualizar";
}) {
	const agora = new Date().toISOString();
	return db.transaction(async (tx) => {
		await liberarEquipamentos(tx, parametros.idsEquipamentosLiberar, agora);
		await alocarEquipamentos(
			tx,
			parametros.locacao.idempresa,
			parametros.idsEquipamentosAlocar,
			agora,
		);

		let registro: Locacao | undefined;
		if (parametros.modo === "criar") {
			const [criado] = await tx
				.insert(locacao)
				.values({
					...parametros.locacao,
					criadoem: agora,
					atualizadoem: agora,
				})
				.returning();
			registro = criado;
		} else {
			const [atualizado] = await tx
				.update(locacao)
				.set({
					...parametros.locacao,
					atualizadoem: agora,
				})
				.where(
					and(
						eq(locacao.id, parametros.locacao.id),
						eq(locacao.situacao, "aberta"),
					),
				)
				.returning();
			if (!atualizado) {
				throw new ErroNegocioLocacao("Locação não está aberta");
			}
			registro = atualizado;
			await tx
				.delete(locacaoitem)
				.where(eq(locacaoitem.idlocacao, parametros.locacao.id));
		}

		if (!registro) {
			throw new ErroNegocioLocacao("Falha ao gravar a locação");
		}

		if (parametros.itens.length > 0) {
			await tx.insert(locacaoitem).values(parametros.itens);
		}

		return registro;
	});
}

export async function persistirCancelamentoLocacao(parametros: {
	id: string;
	idsEquipamentos: string[];
}) {
	const agora = new Date().toISOString();
	return db.transaction(async (tx) => {
		const [registro] = await tx
			.update(locacao)
			.set({ situacao: "cancelada", atualizadoem: agora })
			.where(and(eq(locacao.id, parametros.id), eq(locacao.situacao, "aberta")))
			.returning();
		if (!registro) {
			throw new ErroNegocioLocacao("Locação não está aberta");
		}
		await liberarEquipamentos(tx, parametros.idsEquipamentos, agora);
		return registro;
	});
}

export type LancamentoFechamentoLocacao = {
	idcontacorrente: string;
	idusuario: string;
	idplanocontas: string;
	valor: number;
	historico: string;
	documento: string;
	datahora: string;
};

export async function persistirFechamentoLocacao(parametros: {
	id: string;
	datadevolucao: string;
	formapagamento: "prazo" | "avista";
	valorperiodo: string;
	valormora: string;
	valortotal: string;
	vencimento: string | null;
	idtipodocumento: string | null;
	idplanocontas: string;
	idcontacorrente: string | null;
	idfinanceiro: string | null;
	itens: Array<{
		id: string;
		diasatraso: number;
		valormora: string;
		valortotal: string;
	}>;
	idsEquipamentos: string[];
	financeiro: NovoFinanceiro | null;
	lancamento: LancamentoFechamentoLocacao | null;
}) {
	const agora = new Date().toISOString();
	return db.transaction(async (tx) => {
		const [registro] = await tx
			.update(locacao)
			.set({
				situacao: "fechada",
				datadevolucao: parametros.datadevolucao,
				formapagamento: parametros.formapagamento,
				valorperiodo: parametros.valorperiodo,
				valormora: parametros.valormora,
				valortotal: parametros.valortotal,
				vencimento: parametros.vencimento,
				idtipodocumento: parametros.idtipodocumento,
				idplanocontas: parametros.idplanocontas,
				idcontacorrente: parametros.idcontacorrente,
				idfinanceiro: parametros.idfinanceiro,
				atualizadoem: agora,
			})
			.where(and(eq(locacao.id, parametros.id), eq(locacao.situacao, "aberta")))
			.returning();

		if (!registro) {
			throw new ErroNegocioLocacao("Locação não está aberta");
		}

		for (const item of parametros.itens) {
			await tx
				.update(locacaoitem)
				.set({
					diasatraso: item.diasatraso,
					valormora: item.valormora,
					valortotal: item.valortotal,
				})
				.where(eq(locacaoitem.id, item.id));
		}

		await liberarEquipamentos(tx, parametros.idsEquipamentos, agora);

		if (parametros.financeiro) {
			await tx.insert(financeiro).values(parametros.financeiro);
		}

		if (parametros.lancamento) {
			await inserirLancamentoCaixa(tx, parametros.lancamento);
		}

		return registro;
	});
}
