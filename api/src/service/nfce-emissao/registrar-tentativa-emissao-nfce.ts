import { v4 as uuidv4 } from "uuid";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { logConciliacaoNfce } from "@/util/conciliacao-nfce/mensagens-conciliacao-nfce.js";

export type TentativaEmissaoNfce = {
	idusuario?: string | null;
	idempresa: string;
	idnotafiscal: string;
	idvenda?: string | null;
	tipo: string;
	motivo: string;
	statusAnterior?: number | null;
	statusPosterior?: number | null;
	numero?: string | null;
	serie?: string | null;
	chave?: string | null;
	chaveRetornada?: string | null;
	tpEmis?: number | null;
	cStat?: string | null;
	xMotivo?: string | null;
	protocolo?: string | null;
	regra?: string | null;
};

export async function registrarTentativaEmissaoNfce(
	tentativa: TentativaEmissaoNfce,
): Promise<void> {
	const metadados = {
		idvenda: tentativa.idvenda ?? null,
		tipo: tentativa.tipo,
		motivo: tentativa.motivo,
		statusAnterior: tentativa.statusAnterior ?? null,
		statusPosterior: tentativa.statusPosterior ?? null,
		numero: tentativa.numero ?? null,
		serie: tentativa.serie ?? null,
		chave: tentativa.chave ?? null,
		chaveRetornada: tentativa.chaveRetornada ?? null,
		tpEmis: tentativa.tpEmis ?? null,
		cStat: tentativa.cStat ?? null,
		xMotivo: tentativa.xMotivo ?? null,
		protocolo: tentativa.protocolo ?? null,
		regra: tentativa.regra ?? null,
	};

	logConciliacaoNfce(tentativa.tipo, {
		idempresa: tentativa.idempresa,
		idnotafiscal: tentativa.idnotafiscal,
		...metadados,
	});

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: `nfce_${tentativa.tipo}`,
			recurso: "notafiscal",
			idrecurso: tentativa.idnotafiscal,
			idusuario: tentativa.idusuario ?? null,
			idempresa: tentativa.idempresa,
			criadoem: new Date().toISOString(),
			metadados,
		});
	} catch (erro) {
		logConciliacaoNfce("falha_auditoria", {
			idnotafiscal: tentativa.idnotafiscal,
			mensagem: erro instanceof Error ? erro.message : "falha ao auditar",
		});
	}
}
