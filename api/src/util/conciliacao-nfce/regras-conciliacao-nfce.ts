import { NFE_STATUS } from "@/util/nfe-status.js";
import { cStatIndicaDuplicidadeNfce } from "./extrair-chave-duplicidade-nfce.js";
import type {
	ClasseConsultaChaveNfce,
	DecisaoConciliacaoNfce,
	ProximaAcaoEmissaoNfce,
	ResultadoComparacaoNfce,
} from "./tipos-conciliacao-nfce.js";

const CSTAT_NUMERO_ENCERRADO = new Set([206]);

export function decidirProximaAcaoEmissaoNfce(nota: {
	status?: number | null;
	codigostatusprotocolonfe?: number | null;
}): ProximaAcaoEmissaoNfce {
	const status = nota.status ?? null;
	const cStat = nota.codigostatusprotocolonfe ?? null;

	if (status === NFE_STATUS.AUTORIZADA) return "retornar_autorizada";
	if (
		status === NFE_STATUS.CANCELADA ||
		status === NFE_STATUS.CANCELADA_FORA_PRAZO ||
		status === NFE_STATUS.INUTILIZADA
	) {
		return "bloquear";
	}
	if (
		status === NFE_STATUS.TRANSMITINDO ||
		status === NFE_STATUS.PENDENTE_CONSULTA ||
		status === NFE_STATUS.RECUPERANDO ||
		status === NFE_STATUS.CONFLITO
	) {
		return "conciliar";
	}
	if (status === NFE_STATUS.DENEGADA) return "nova_numeracao_comprovada";
	if (
		status === NFE_STATUS.REJEITADA &&
		cStat != null &&
		CSTAT_NUMERO_ENCERRADO.has(cStat)
	) {
		return "nova_numeracao_comprovada";
	}
	if (status === NFE_STATUS.REJEITADA && cStatIndicaDuplicidadeNfce(cStat)) {
		return "conciliar";
	}
	if (
		status === NFE_STATUS.REJEITADA ||
		status === NFE_STATUS.PENDENTE ||
		status == null
	) {
		return "transmitir_mesma_identidade";
	}
	return "conciliar";
}

export function resolverAcaoConciliacaoNfce(entrada: {
	classeConsulta: ClasseConsultaChaveNfce;
	chaveConsultadaEhALocal: boolean;
	comparacao: ResultadoComparacaoNfce | null;
}): DecisaoConciliacaoNfce {
	if (entrada.classeConsulta === "desconhecida") {
		return {
			acao: "AGUARDAR",
			regra: "consulta_inconclusiva",
			prosseguirTransmissao: false,
		};
	}

	if (entrada.classeConsulta === "nao_encontrada") {
		if (entrada.chaveConsultadaEhALocal) {
			return {
				acao: "AUTO_CORRIGIR",
				regra: "consulta_217_reenviar_mesma_chave",
				prosseguirTransmissao: true,
			};
		}
		return {
			acao: "EXIGIR_INTERVENCAO",
			regra: "chave_539_nao_encontrada",
			prosseguirTransmissao: false,
		};
	}

	if (
		entrada.classeConsulta === "cancelada" ||
		entrada.classeConsulta === "denegada"
	) {
		return {
			acao: "EXIGIR_INTERVENCAO",
			regra: `consulta_${entrada.classeConsulta}`,
			prosseguirTransmissao: false,
		};
	}

	if (entrada.classeConsulta === "rejeitada") {
		return {
			acao: "BLOQUEAR",
			regra: "consulta_rejeitada",
			prosseguirTransmissao: false,
		};
	}

	const comparacao = entrada.comparacao;
	if (!entrada.chaveConsultadaEhALocal) {
		if (!comparacao?.equivalente) {
			return {
				acao: "EXIGIR_INTERVENCAO",
				regra: comparacao?.evidenciaInsuficiente
					? "539_sem_evidencia_suficiente"
					: "539_documento_divergente",
				prosseguirTransmissao: false,
			};
		}
		return {
			acao: "AUTO_RECUPERAR",
			regra: "539_documento_equivalente",
			prosseguirTransmissao: false,
		};
	}

	if (
		comparacao &&
		!comparacao.equivalente &&
		!comparacao.evidenciaInsuficiente
	) {
		return {
			acao: "EXIGIR_INTERVENCAO",
			regra: "mesma_chave_valores_divergentes",
			prosseguirTransmissao: false,
		};
	}

	return {
		acao: "AUTO_RECUPERAR",
		regra: "autorizacao_da_propria_chave",
		prosseguirTransmissao: false,
	};
}

export function deveReservarNovaNumeracao(
	acao: ProximaAcaoEmissaoNfce,
): boolean {
	return acao === "nova_numeracao_comprovada";
}
