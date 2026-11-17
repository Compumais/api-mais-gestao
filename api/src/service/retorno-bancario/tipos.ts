export type OcorrenciaRetornoCnab = {
	nossonumero: string;
	numerodocumento: string | null;
	nomesacado: string | null;
	valor: string | null;
	valorpago: string | null;
	vencimento: string | null;
	datacredito: string | null;
	dataocorrencia: string | null;
	ocorrencia: string;
	ocorrenciadescricao: string | null;
	motivo: string | null;
	desconto: string | null;
	abatimento: string | null;
	juros: string | null;
	multa: string | null;
	outrosacrescimos: string | null;
	taxacobranca: string | null;
	valoriof: string | null;
	raw: string;
};

export type ResultadoParseRetorno = {
	itens: OcorrenciaRetornoCnab[];
	layoutDetectado?: string;
};
