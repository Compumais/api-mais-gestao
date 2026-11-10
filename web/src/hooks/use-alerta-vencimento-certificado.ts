"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CertificadoDigitalResumo,
	nfeConfiguracaoService,
} from "@/services/nfe-configuracao.service";

export const DIAS_ALERTA_VENCIMENTO_CERTIFICADO = 30;

export interface AvaliacaoVencimentoCertificadoWeb {
	emAlerta: boolean;
	vencido: boolean;
	critico: boolean;
	diasRestantes: number;
	dataFormatada: string;
	titulo: string;
	descricao: string;
}

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

export function avaliarVencimentoCertificadoWeb(
	validadefim: string | null | undefined,
	apelido?: string | null,
	referencia: Date = new Date(),
	diasLimite = DIAS_ALERTA_VENCIMENTO_CERTIFICADO,
): AvaliacaoVencimentoCertificadoWeb | null {
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
	const critico = diasRestantes <= 7;

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

	const labelCert = apelido?.trim() ? ` (${apelido.trim()})` : "";
	const descricao = vencido
		? `O certificado digital${labelCert} venceu em ${dataFormatada}. Atualize o certificado para continuar emitindo notas fiscais.`
		: `O certificado digital${labelCert} vence em ${dataFormatada}. Providencie a renovação para evitar interrupção na emissão de notas.`;

	return {
		emAlerta,
		vencido,
		critico,
		diasRestantes,
		dataFormatada,
		titulo,
		descricao,
	};
}

export function useAlertaVencimentoCertificado(idempresaProp?: string | null) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idempresa = idempresaProp ?? empresa?.id ?? "";

	const { data: certificados, isLoading } = useQuery({
		queryKey: ["certificados-digitais", idempresa],
		queryFn: () => nfeConfiguracaoService.listarCertificados(idempresa),
		enabled: !!idempresa,
		staleTime: 5 * 60_000,
	});

	const certificadoAtivo: CertificadoDigitalResumo | null = useMemo(
		() => (certificados ?? []).find((cert) => cert.ativo) ?? null,
		[certificados],
	);

	const avaliacao = useMemo(
		() =>
			certificadoAtivo
				? avaliarVencimentoCertificadoWeb(
						certificadoAtivo.validadefim,
						certificadoAtivo.apelido,
					)
				: null,
		[certificadoAtivo],
	);

	return {
		certificadoAtivo,
		avaliacao,
		mostrarAlerta: Boolean(avaliacao?.emAlerta),
		isLoading,
	};
}
