import { api } from "@/lib/axios";

export type StatusManifestacaoInbound =
	| "sem_manifestacao"
	| "ciencia_enviada"
	| "confirmada"
	| "desconhecida"
	| "nao_realizada"
	| "evento_recebido";

export type StatusImportacaoInbound =
	| "aguardando_xml"
	| "disponivel"
	| "rascunho_criado"
	| "importado"
	| "ignorado"
	| "erro";

export type NfeInboundSyncStatus = {
	idempresa: string;
	ultimonsu: string;
	maxnsu: string | null;
	ultimosync: string | null;
	proximotentativa: string | null;
	sincronizando: boolean;
	importacaoautomatica: boolean;
	tentativasbackoff: number;
};

export type NfeInboundDocumento = {
	id: string;
	idempresa: string;
	nsu: string;
	chavenfe: string;
	tipodocumento: string;
	cnpjemitente: string | null;
	razaoemitente: string | null;
	numero: number | null;
	serie: number | null;
	dataemissao: string | null;
	valortotal: string | null;
	statusmanifestacao: StatusManifestacaoInbound;
	statusimportacao: StatusImportacaoInbound;
	idrascunho: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type ListarDocumentosNfeInboundResposta = {
	data: NfeInboundDocumento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type ResultadoSincronizacaoInbound = {
	idempresa: string;
	nsuInicial: string;
	nsuFinal: string;
	quantidadeXml: number;
	tempoMs: number;
	falhas: Array<{ nsu: string; motivo: string }>;
	parouPor656: boolean;
	cStat?: string;
	xMotivo?: string;
};

export async function obterStatusSyncNfeInbound(
	idempresa: string,
): Promise<NfeInboundSyncStatus> {
	const { data } = await api.get<NfeInboundSyncStatus>(
		"/nfe-inbound/sync-status",
		{ params: { idempresa } },
	);
	return data;
}

export async function listarDocumentosNfeInbound(params: {
	idempresa: string;
	page?: number;
	limit?: number;
	statusimportacao?: StatusImportacaoInbound;
	statusmanifestacao?: StatusManifestacaoInbound;
}): Promise<ListarDocumentosNfeInboundResposta> {
	const { data } = await api.get<ListarDocumentosNfeInboundResposta>(
		"/nfe-inbound/documentos",
		{ params },
	);
	return data;
}

export async function sincronizarNfeInbound(
	idempresa: string,
): Promise<ResultadoSincronizacaoInbound> {
	const { data } = await api.post<ResultadoSincronizacaoInbound>(
		"/nfe-inbound/sincronizar",
		{ idempresa },
	);
	return data;
}

export async function importarDocumentoNfeInbound(
	idempresa: string,
	idDocumento: string,
): Promise<{ idRascunho: string; urlRascunho: string }> {
	const { data } = await api.post<{ idRascunho: string; urlRascunho: string }>(
		`/nfe-inbound/documentos/${idDocumento}/importar`,
		{ idempresa },
	);
	return data;
}

export type DiagnosticarChaveNfeResposta = {
	chave: string;
	chaveDecodificada: {
		codigoUf: string;
		siglaUf: string | null;
		cnpjEmitente: string;
		modelo: string;
	} | null;
	empresa: {
		cnpj: string;
		uf: string | null;
		ambiente: number | null;
		ambienteDescricao: string | null;
	};
	certificado: {
		cnpj: string | null;
		cnpjBaseIgualEmpresa: boolean;
	};
	preConsulta: {
		ok: boolean;
		inconsistencias: Array<{
			codigo: string;
			mensagem: string;
			severidade: "erro" | "aviso";
		}>;
	};
	sefaz: {
		consultado: boolean;
		cStat?: string;
		xMotivo?: string;
		quantidadeDocumentos?: number;
	} | null;
};

export async function manifestarCienciaNfeInbound(
	idempresa: string,
	idDocumento: string,
): Promise<{ chavenfe: string; cStat?: string; xMotivo?: string }> {
	const { data } = await api.post<{
		chavenfe: string;
		cStat?: string;
		xMotivo?: string;
	}>(`/nfe-inbound/documentos/${idDocumento}/manifestar-ciencia`, {
		idempresa,
	});
	return data;
}

export async function diagnosticarChaveNfeInbound(params: {
	idempresa: string;
	chave: string;
	xml?: string;
	consultarSefaz?: boolean;
}): Promise<DiagnosticarChaveNfeResposta> {
	const { data } = await api.post<DiagnosticarChaveNfeResposta>(
		"/nfe-inbound/diagnosticar-chave",
		params.xml ? { xml: params.xml } : {},
		{
			params: {
				idempresa: params.idempresa,
				chave: params.chave,
				consultarSefaz: params.consultarSefaz === false ? "false" : "true",
			},
		},
	);
	return data;
}

export async function baixarXmlNfeInbound(
	idempresa: string,
	idDocumento: string,
	chavenfe: string,
): Promise<void> {
	const response = await api.get(`/nfe-inbound/documentos/${idDocumento}/xml`, {
		params: { idempresa },
		responseType: "blob",
	});

	const blob = new Blob([response.data], {
		type: "application/xml;charset=utf-8",
	});
	const blobUrl = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = `${chavenfe}.xml`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(blobUrl);
}
