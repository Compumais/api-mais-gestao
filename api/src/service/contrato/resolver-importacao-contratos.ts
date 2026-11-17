import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { NovoContrato } from "@/model/contrato-model.js";
import { db } from "@/repositories/connection.js";
import {
	buscarProximoCodigoContrato,
	buscarProximoCodigoGrupoContrato,
	buscarProximoCodigoTipoContrato,
} from "@/repositories/proximo-codigo-repositories.js";
import {
	contrato,
	entidade,
	grupocontrato,
	tipocontrato,
} from "@/repositories/schema.js";
import {
	FLUXO_FATURAMENTO_CONTRATO,
	PERIODICIDADE_CONTRATO,
	REGRA_COMPETENCIA_CONTRATO,
	SITUACAO_CONTRATO,
} from "@/util/contrato-constants.js";
import {
	type LinhaImportacaoContrato,
	normalizarTextoCabecalho,
	type ResultadoValidacaoImportacaoContratos,
} from "@/util/contratos-importacao.js";

export type ContratoImportacaoResolvido = LinhaImportacaoContrato & {
	acao: "criar";
	identidade: string | null;
	nomeCliente: string | null;
	clientePendente: boolean;
	identidadeSugerida: string | null;
	nomeSugerido: string | null;
	idgrupocontrato: string | null;
	criarGrupo: boolean;
	descricaoGrupo: string | null;
	idtipocontrato: string | null;
	criarTipo: boolean;
	descricaoTipo: string | null;
	codigoContrato: string | null;
};

export type ContratoPendenteImportacao = {
	linha: number;
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string;
	diavencimento: number;
};

export type ClientePendenteImportacao = {
	codigocliente: string;
	identidadeSugerida: string | null;
	nomeSugerido: string | null;
	contratos: ContratoPendenteImportacao[];
};

export function chaveClienteImportacao(codigo: string): string {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length === 11 || digitos.length === 14) return digitos;
	return codigo.trim();
}

export function agruparClientesPendentes(
	resolvidos: ContratoImportacaoResolvido[],
): ClientePendenteImportacao[] {
	const mapa = new Map<string, ClientePendenteImportacao>();

	for (const item of resolvidos) {
		if (!item.clientePendente || item.erros.length > 0) continue;
		if (!item.valor || item.diavencimento === null) continue;

		const chave = chaveClienteImportacao(item.codigocliente);
		const contrato: ContratoPendenteImportacao = {
			linha: item.linha,
			grupocontrato: item.grupocontrato,
			tipocontrato: item.tipocontrato,
			descricao: item.descricao,
			valor: item.valor,
			diavencimento: item.diavencimento,
		};
		const atual = mapa.get(chave);

		if (!atual) {
			mapa.set(chave, {
				codigocliente: item.codigocliente.trim(),
				identidadeSugerida: item.identidadeSugerida,
				nomeSugerido: item.nomeSugerido,
				contratos: [contrato],
			});
			continue;
		}

		atual.contratos.push(contrato);
		if (!atual.identidadeSugerida && item.identidadeSugerida) {
			atual.identidadeSugerida = item.identidadeSugerida;
			atual.nomeSugerido = item.nomeSugerido;
		}
	}

	return [...mapa.values()];
}

function somenteDigitos(valor: string): string {
	return valor.replace(/\D/g, "");
}

function dataHojeIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function resolverContratosImportacao(parametros: {
	idempresa: string;
	validacao: ResultadoValidacaoImportacaoContratos;
}): Promise<ContratoImportacaoResolvido[]> {
	const { idempresa, validacao } = parametros;

	const [clientes, grupos, tipos, proximoContrato] = await Promise.all([
		db
			.select({
				id: entidade.id,
				nome: entidade.nome,
				cnpjcpf: entidade.cnpjcpf,
				cliente: entidade.cliente,
			})
			.from(entidade)
			.where(eq(entidade.idempresa, idempresa)),
		db
			.select()
			.from(grupocontrato)
			.where(eq(grupocontrato.idempresa, idempresa)),
		db.select().from(tipocontrato).where(eq(tipocontrato.idempresa, idempresa)),
		buscarProximoCodigoContrato(idempresa),
	]);

	const clientePorDocumento = new Map<string, (typeof clientes)[number]>();
	const clientePorId = new Map<string, (typeof clientes)[number]>();
	for (const cliente of clientes) {
		clientePorId.set(cliente.id, cliente);
		const documento = somenteDigitos(cliente.cnpjcpf ?? "");
		if (documento) {
			clientePorDocumento.set(documento, cliente);
		}
	}

	const grupoPorDescricao = new Map<string, (typeof grupos)[number]>();
	let maxCodigoGrupo = 0;
	for (const grupo of grupos) {
		grupoPorDescricao.set(normalizarTextoCabecalho(grupo.descricao), grupo);
		if (grupo.codigo > maxCodigoGrupo) maxCodigoGrupo = grupo.codigo;
	}

	const tipoPorDescricao = new Map<string, (typeof tipos)[number]>();
	let maxCodigoTipo = 0;
	for (const tipo of tipos) {
		tipoPorDescricao.set(normalizarTextoCabecalho(tipo.descricao), tipo);
		if (tipo.codigo > maxCodigoTipo) maxCodigoTipo = tipo.codigo;
	}

	const gruposPendentes = new Map<
		string,
		{ id: string; codigo: number; descricao: string }
	>();
	const tiposPendentes = new Map<
		string,
		{
			id: string;
			codigo: number;
			descricao: string;
			valor: string;
			idgrupocontrato: string | null;
		}
	>();

	let proximoCodigoGrupo = maxCodigoGrupo + 1;
	let proximoCodigoTipo = maxCodigoTipo + 1;
	let proximoCodigoContrato = Number(proximoContrato) || 1;

	const resolvidos: ContratoImportacaoResolvido[] = [];

	for (const linha of validacao.contratos) {
		const erros = [...linha.erros];
		let identidade: string | null = null;
		let nomeCliente: string | null = null;
		let clientePendente = false;
		let identidadeSugerida: string | null = null;
		let nomeSugerido: string | null = null;

		const codigoCliente = linha.codigocliente.trim();
		if (codigoCliente) {
			const porId = clientePorId.get(codigoCliente);
			const porDocumento = clientePorDocumento.get(
				somenteDigitos(codigoCliente),
			);
			const cliente = porId ?? porDocumento;
			if (!cliente || Number(cliente.cliente) !== 1) {
				clientePendente = true;
				if (cliente) {
					identidadeSugerida = cliente.id;
					nomeSugerido = cliente.nome;
				}
			} else {
				identidade = cliente.id;
				nomeCliente = cliente.nome;
			}
		}

		const descricaoGrupo = linha.grupocontrato.trim();
		let idgrupocontrato: string | null = null;
		let criarGrupo = false;

		if (descricaoGrupo) {
			const chaveGrupo = normalizarTextoCabecalho(descricaoGrupo);
			const grupoExistente = grupoPorDescricao.get(chaveGrupo);
			const grupoPendente = gruposPendentes.get(chaveGrupo);
			if (grupoExistente) {
				idgrupocontrato = grupoExistente.id;
			} else if (grupoPendente) {
				idgrupocontrato = grupoPendente.id;
				criarGrupo = true;
			} else {
				const novo = {
					id: uuidv4(),
					codigo: proximoCodigoGrupo,
					descricao: descricaoGrupo.slice(0, 120),
				};
				proximoCodigoGrupo += 1;
				gruposPendentes.set(chaveGrupo, novo);
				idgrupocontrato = novo.id;
				criarGrupo = true;
			}
		}

		const descricaoTipo = linha.tipocontrato.trim();
		let idtipocontrato: string | null = null;
		let criarTipo = false;

		if (descricaoTipo) {
			const chaveTipo = normalizarTextoCabecalho(descricaoTipo);
			const tipoExistente = tipoPorDescricao.get(chaveTipo);
			const tipoPendente = tiposPendentes.get(chaveTipo);
			if (tipoExistente) {
				idtipocontrato = tipoExistente.id;
			} else if (tipoPendente) {
				idtipocontrato = tipoPendente.id;
				criarTipo = true;
			} else {
				const valorTipo = linha.valor ?? "0.00";
				const novo = {
					id: uuidv4(),
					codigo: proximoCodigoTipo,
					descricao: descricaoTipo.slice(0, 120),
					valor: valorTipo,
					idgrupocontrato,
				};
				proximoCodigoTipo += 1;
				tiposPendentes.set(chaveTipo, novo);
				idtipocontrato = novo.id;
				criarTipo = true;
			}
		}

		const codigoContrato = String(proximoCodigoContrato);
		proximoCodigoContrato += 1;

		resolvidos.push({
			...linha,
			erros,
			acao: "criar",
			identidade,
			nomeCliente,
			clientePendente,
			identidadeSugerida,
			nomeSugerido,
			idgrupocontrato,
			criarGrupo,
			descricaoGrupo: descricaoGrupo || null,
			idtipocontrato,
			criarTipo,
			descricaoTipo: descricaoTipo || null,
			codigoContrato,
		});
	}

	return resolvidos;
}

export async function persistirImportacaoContratos(parametros: {
	idempresa: string;
	idtipodocumento: string;
	resolvidos: ContratoImportacaoResolvido[];
}): Promise<{
	criados: number;
	gruposCriados: number;
	tiposCriados: number;
}> {
	const { idempresa, idtipodocumento, resolvidos } = parametros;
	const aptos = resolvidos.filter(
		(item): item is ContratoImportacaoResolvido & { identidade: string } =>
			Boolean(item.identidade) && item.erros.length === 0,
	);
	const agora = new Date().toISOString();
	const datainicio = dataHojeIso();

	const gruposParaCriar = new Map<string, { id: string; descricao: string }>();
	const tiposParaCriar = new Map<
		string,
		{
			id: string;
			descricao: string;
			valor: string;
			idgrupocontrato: string | null;
		}
	>();

	for (const item of aptos) {
		if (item.criarGrupo && item.idgrupocontrato && item.descricaoGrupo) {
			const chave = normalizarTextoCabecalho(item.descricaoGrupo);
			if (!gruposParaCriar.has(chave)) {
				gruposParaCriar.set(chave, {
					id: item.idgrupocontrato,
					descricao: item.descricaoGrupo.slice(0, 120),
				});
			}
		}
		if (item.criarTipo && item.idtipocontrato && item.descricaoTipo) {
			const chave = normalizarTextoCabecalho(item.descricaoTipo);
			if (!tiposParaCriar.has(chave)) {
				tiposParaCriar.set(chave, {
					id: item.idtipocontrato,
					descricao: item.descricaoTipo.slice(0, 120),
					valor: item.valor ?? "0.00",
					idgrupocontrato: item.idgrupocontrato,
				});
			}
		}
	}

	const [proximoGrupo, proximoTipo, proximoContrato] = await Promise.all([
		buscarProximoCodigoGrupoContrato(idempresa),
		buscarProximoCodigoTipoContrato(idempresa),
		buscarProximoCodigoContrato(idempresa),
	]);

	let codigoGrupo = proximoGrupo;
	let codigoTipo = proximoTipo;
	let codigoContratoAtual = Number(proximoContrato) || 1;

	await db.transaction(async (tx) => {
		for (const grupo of gruposParaCriar.values()) {
			await tx.insert(grupocontrato).values({
				id: grupo.id,
				idempresa,
				codigo: codigoGrupo,
				descricao: grupo.descricao,
			});
			codigoGrupo += 1;
		}

		for (const tipo of tiposParaCriar.values()) {
			await tx.insert(tipocontrato).values({
				id: tipo.id,
				idempresa,
				idgrupocontrato: tipo.idgrupocontrato,
				codigo: codigoTipo,
				descricao: tipo.descricao,
				valor: tipo.valor,
			});
			codigoTipo += 1;
		}

		const contratos: NovoContrato[] = aptos.map((item) => {
			const codigo = String(codigoContratoAtual);
			codigoContratoAtual += 1;
			return {
				id: uuidv4(),
				idempresa,
				identidade: item.identidade,
				idtipocontrato: item.idtipocontrato,
				codigo,
				descricao: item.descricao.slice(0, 255),
				situacao: SITUACAO_CONTRATO.ATIVO,
				datainicio,
				datafim: null,
				valor: item.valor as string,
				periodicidade: PERIODICIDADE_CONTRATO.MENSAL,
				diavencimento: item.diavencimento as number,
				regracompetencia: REGRA_COMPETENCIA_CONTRATO.MES_ATUAL,
				fluxofaturamento: FLUXO_FATURAMENTO_CONTRATO.SO_CR,
				discriminacao: null,
				itemlistaservico: null,
				codigonbs: null,
				codigotributacaonacional: null,
				idcondicaopagto: null,
				idtipodocumento,
				idplanocontas: null,
				idcontacorrente: null,
				idtipocobranca: null,
				observacao: null,
				criadoem: agora,
				atualizadoem: agora,
			};
		});

		if (contratos.length > 0) {
			await tx.insert(contrato).values(contratos);
		}
	});

	return {
		criados: aptos.length,
		gruposCriados: gruposParaCriar.size,
		tiposCriados: tiposParaCriar.size,
	};
}
