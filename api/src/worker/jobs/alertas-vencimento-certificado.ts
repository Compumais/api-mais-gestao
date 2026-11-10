import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/repositories/connection.js";
import { buscarEmpresasDoUsuario } from "@/repositories/entidade-repositories.js";
import {
	criarNotificacao,
	existeNotificacaoParaRecurso,
} from "@/repositories/notificacoes-repositories.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import type { JobContext, JobResult } from "@/worker/types.js";
import { formatarDataIso } from "@/worker/util/configuracao-notificacoes.js";
import * as schema from "../../../drizzle/schema.js";

export const DIAS_ALERTA_VENCIMENTO_CERTIFICADO = 30;

export type AvaliacaoVencimentoCertificado = {
	emAlerta: boolean;
	vencido: boolean;
	diasRestantes: number;
	dataFormatada: string;
	titulo: string;
};

function extrairAnoMesDia(valor: string): {
	ano: number;
	mes: number;
	dia: number;
} | null {
	const limpo = valor.trim();
	if (!limpo) return null;

	const matchIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpo);
	if (matchIso) {
		const ano = Number(matchIso[1]);
		const mes = Number(matchIso[2]);
		const dia = Number(matchIso[3]);
		if (ano > 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
			return { ano, mes, dia };
		}
	}

	const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(limpo);
	if (matchBr) {
		const dia = Number(matchBr[1]);
		const mes = Number(matchBr[2]);
		const ano = Number(matchBr[3]);
		if (ano > 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
			return { ano, mes, dia };
		}
	}

	const parsed = new Date(limpo);
	if (!Number.isNaN(parsed.getTime())) {
		return {
			ano: parsed.getUTCFullYear(),
			mes: parsed.getUTCMonth() + 1,
			dia: parsed.getUTCDate(),
		};
	}

	return null;
}

export function avaliarVencimentoCertificado(
	validadefim: string | null | undefined,
	referencia: Date = new Date(),
	diasLimite = DIAS_ALERTA_VENCIMENTO_CERTIFICADO,
): AvaliacaoVencimentoCertificado | null {
	if (!validadefim) return null;
	const partes = extrairAnoMesDia(validadefim);
	if (!partes) return null;

	const utcVencimento = Date.UTC(partes.ano, partes.mes - 1, partes.dia);
	const utcHoje = Date.UTC(
		referencia.getFullYear(),
		referencia.getMonth(),
		referencia.getDate(),
	);

	const diasRestantes = Math.round((utcVencimento - utcHoje) / 86_400_000);
	const dataFormatada = `${String(partes.dia).padStart(2, "0")}/${String(partes.mes).padStart(2, "0")}/${partes.ano}`;
	const vencido = diasRestantes < 0;
	const emAlerta = diasRestantes <= diasLimite;

	let titulo: string;
	if (diasRestantes < 0) {
		const atraso = Math.abs(diasRestantes);
		titulo =
			atraso === 1
				? "Seu certificado digital venceu há 1 dia"
				: `Seu certificado digital venceu há ${atraso} dias`;
	} else if (diasRestantes === 0) {
		titulo = "Seu certificado digital vence hoje";
	} else if (diasRestantes === 1) {
		titulo = "Falta 1 dia para o seu certificado vencer";
	} else {
		titulo = `Faltam ${diasRestantes} dias para o seu certificado vencer`;
	}

	return {
		emAlerta,
		vencido,
		diasRestantes,
		dataFormatada,
		titulo,
	};
}

export async function executarAlertasVencimentoCertificado(
	contexto: JobContext,
): Promise<JobResult> {
	const certificados = await db
		.select({
			id: schema.certificadodigital.id,
			idempresa: schema.certificadodigital.idempresa,
			apelido: schema.certificadodigital.apelido,
			cnpjcertificado: schema.certificadodigital.cnpjcertificado,
			validadefim: schema.certificadodigital.validadefim,
		})
		.from(schema.certificadodigital)
		.where(
			and(
				eq(schema.certificadodigital.ativo, true),
				isNotNull(schema.certificadodigital.validadefim),
			),
		);

	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;
	const hojeIso = formatarDataIso(contexto.agora);

	for (const cert of certificados) {
		processadas++;
		const avaliacao = avaliarVencimentoCertificado(
			cert.validadefim,
			contexto.agora,
		);
		if (!avaliacao || !avaliacao.emAlerta) {
			ignoradas++;
			continue;
		}

		const criadas = await criarNotificacaoAgendadaService({
			tipo: "alerta_vencimento_certificado",
			idempresa: cert.idempresa,
			idrecurso: `certificado:${cert.id}:${hojeIso}`,
			titulo: avaliacao.titulo,
			detalhes: {
				certificado: cert.apelido,
				cnpj: cert.cnpjcertificado,
				vencimento: avaliacao.dataFormatada,
				diasRestantes: avaliacao.diasRestantes,
			},
		});

		if (criadas > 0) {
			notificacoes += criadas;
		} else {
			ignoradas++;
		}
	}

	return { processadas, notificacoes, ignoradas };
}

export async function sincronizarNotificacoesCertificadoUsuario(
	idusuario: string,
	idempresaFiltro?: string,
): Promise<void> {
	const empresasDoUsuario = await buscarEmpresasDoUsuario(idusuario);
	const empresasIds = idempresaFiltro
		? empresasDoUsuario.filter((id) => id === idempresaFiltro)
		: empresasDoUsuario;

	if (empresasIds.length === 0) return;

	const certificados = await db
		.select({
			id: schema.certificadodigital.id,
			idempresa: schema.certificadodigital.idempresa,
			apelido: schema.certificadodigital.apelido,
			cnpjcertificado: schema.certificadodigital.cnpjcertificado,
			validadefim: schema.certificadodigital.validadefim,
		})
		.from(schema.certificadodigital)
		.where(
			and(
				inArray(schema.certificadodigital.idempresa, empresasIds),
				eq(schema.certificadodigital.ativo, true),
				isNotNull(schema.certificadodigital.validadefim),
			),
		);

	if (certificados.length === 0) return;

	const agora = new Date();
	const hojeIso = formatarDataIso(agora);

	for (const cert of certificados) {
		const avaliacao = avaliarVencimentoCertificado(cert.validadefim, agora);
		if (!avaliacao || !avaliacao.emAlerta) continue;

		const idrecurso = `certificado:${cert.id}:${hojeIso}`;
		const jaExiste = await existeNotificacaoParaRecurso(
			idusuario,
			"alerta_vencimento_certificado",
			idrecurso,
		);
		if (jaExiste) continue;

		await criarNotificacao({
			id: randomUUID(),
			idusuario,
			idempresa: cert.idempresa,
			tipo: "alerta_vencimento_certificado",
			idrecurso,
			titulo: avaliacao.titulo,
			detalhes: {
				certificado: cert.apelido,
				cnpj: cert.cnpjcertificado,
				vencimento: avaliacao.dataFormatada,
				diasRestantes: avaliacao.diasRestantes,
			},
			lida: false,
		});
	}
}
