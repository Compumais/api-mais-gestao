export type TipoDocumentoInbound =
	| "resNFe"
	| "procNFe"
	| "procEventoNFe";

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

export type NfeInboundDocumento = {
	id: string;
	idempresa: string;
	nsu: string;
	chavenfe: string;
	tipodocumento: TipoDocumentoInbound;
	cnpjemitente: string | null;
	razaoemitente: string | null;
	numero: number | null;
	serie: number | null;
	dataemissao: string | null;
	valortotal: string | null;
	xml: string | null;
	statusmanifestacao: StatusManifestacaoInbound;
	statusimportacao: StatusImportacaoInbound;
	idrascunho: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type NfeInboundDocumentoListagem = Omit<NfeInboundDocumento, "xml"> & {
	jaImportada: boolean;
	idnotafiscal: string | null;
};

export type EmpresaNfeSync = {
	idempresa: string;
	ultimonsu: string;
	maxnsu: string | null;
	ultimosync: string | null;
	proximotentativa: string | null;
	sincronizando: boolean;
	importacaoautomatica: boolean;
	tentativasbackoff: number;
};

export type MetadadosDocumentoInbound = {
	chavenfe: string;
	cnpjemitente?: string;
	razaoemitente?: string;
	numero?: number;
	serie?: number;
	dataemissao?: string;
	valortotal?: string;
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
