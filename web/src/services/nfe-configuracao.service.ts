import { api } from "@/lib/axios";

export interface NfeConfiguracao {
	id: string;
	idempresa: string;
	ambiente: number;
	versaoleiaute: string;
	schema: string;
	idcertificadoativo?: string | null;
	verproc?: string | null;
	tokenibpt?: string | null;
	emailenvioxml?: string | null;
	infresptec_cnpj?: string | null;
	infresptec_nome?: string | null;
	infresptec_email?: string | null;
	infresptec_fone?: string | null;
	contingenciaativa: boolean;
	ultimacfopsaida?: string | null;
	ultimanatop?: string | null;
	ultimaidserie?: string | null;
}

export interface CertificadoDigitalResumo {
	id: string;
	idempresa: string;
	apelido: string;
	cnpjcertificado: string;
	validadeinicio?: string | null;
	validadefim?: string | null;
	serial?: string | null;
	thumbprint?: string | null;
	ativo: boolean;
}

export interface NfeSerie {
	id: string;
	idempresa: string;
	modelo: string;
	serie: string;
	numeroproximo: number;
	padrao: boolean;
	ativo: boolean;
}

export interface PendenciaNfe {
	codigo: string;
	mensagem: string;
}

export interface ResultadoSefaz {
	cStat?: string;
	xMotivo?: string;
	xml?: string;
	pendencias?: PendenciaNfe[];
}

export interface ResultadoEmissaoTeste {
	idnotafiscal?: string;
	chave?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
	pendencias?: PendenciaNfe[];
}

export const nfeConfiguracaoService = {
	async buscar(idempresa: string): Promise<NfeConfiguracao> {
		const { data } = await api.get<NfeConfiguracao>(
			`/empresas/${idempresa}/nfe-configuracao`,
		);
		return data;
	},

	async atualizar(
		idempresa: string,
		dados: Partial<NfeConfiguracao>,
	): Promise<NfeConfiguracao> {
		const { data } = await api.put<NfeConfiguracao>(
			`/empresas/${idempresa}/nfe-configuracao`,
			dados,
		);
		return data;
	},

	async listarCertificados(
		idempresa: string,
	): Promise<CertificadoDigitalResumo[]> {
		const { data } = await api.get<{ data: CertificadoDigitalResumo[] }>(
			"/certificados-digitais",
			{ params: { idempresa } },
		);
		return data.data;
	},

	async enviarCertificado(params: {
		idempresa: string;
		apelido: string;
		senha: string;
		arquivopfxBase64: string;
	}): Promise<CertificadoDigitalResumo> {
		const { data } = await api.post<CertificadoDigitalResumo>(
			"/certificados-digitais",
			params,
		);
		return data;
	},

	async ativarCertificado(
		id: string,
		idempresa: string,
	): Promise<CertificadoDigitalResumo> {
		const { data } = await api.post<CertificadoDigitalResumo>(
			`/certificados-digitais/${id}/ativar`,
			null,
			{ params: { idempresa } },
		);
		return data;
	},

	async excluirCertificado(id: string, idempresa: string): Promise<void> {
		await api.delete(`/certificados-digitais/${id}`, {
			params: { idempresa },
		});
	},

	async listarSeries(idempresa: string, modelo?: string): Promise<NfeSerie[]> {
		const { data } = await api.get<{ data: NfeSerie[] }>("/nfe-series", {
			params: {
				idempresa,
				...(modelo ? { modelo } : {}),
			},
		});
		return data.data;
	},

	async criarSerie(
		dados: Omit<NfeSerie, "id" | "idempresa"> & {
			idempresa: string;
			modelo?: string;
		},
	): Promise<NfeSerie> {
		const { data } = await api.post<NfeSerie>("/nfe-series", {
			modelo: dados.modelo ?? "55",
			...dados,
		});
		return data;
	},

	async atualizarSerie(
		id: string,
		dados: Partial<NfeSerie> & { idempresa: string },
	): Promise<NfeSerie> {
		const { data } = await api.put<NfeSerie>(`/nfe-series/${id}`, dados);
		return data;
	},

	async excluirSerie(id: string, idempresa: string): Promise<void> {
		await api.delete(`/nfe-series/${id}`, {
			params: { idempresa },
		});
	},

	async testarStatusSefaz(idempresa: string): Promise<ResultadoSefaz> {
		const { data } = await api.post<ResultadoSefaz>("/nfe/sefaz/status", {
			idempresa,
		});
		return data;
	},

	async emitirTesteHomologacao(
		idempresa: string,
	): Promise<ResultadoEmissaoTeste> {
		const { data } = await api.post<ResultadoEmissaoTeste>(
			"/nfe/homologacao/testar",
			{ idempresa },
		);
		return data;
	},
};
