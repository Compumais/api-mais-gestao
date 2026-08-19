import type { dominioenvio, dominiointegracao } from "@/repositories/schema.js";

export type DominioIntegracao = typeof dominiointegracao.$inferSelect;
export type NovaDominioIntegracao = typeof dominiointegracao.$inferInsert;

export type DominioEnvio = typeof dominioenvio.$inferSelect;
export type NovoDominioEnvio = typeof dominioenvio.$inferInsert;

export const DOMINIO_ENVIO_TIPOS = ["autorizada", "cancelamento"] as const;
export type DominioEnvioTipo = (typeof DOMINIO_ENVIO_TIPOS)[number];

export const DOMINIO_ENVIO_STATUS = [
	"pendente",
	"enviando",
	"aguardando_processamento",
	"armazenado",
	"erro",
] as const;
export type DominioEnvioStatus = (typeof DOMINIO_ENVIO_STATUS)[number];

export type DominioIntegracaoPublica = {
	id: string;
	idempresa: string;
	habilitado: boolean;
	boxefile: boolean;
	chavecontadorMascarada: string | null;
	chaveConfigurada: boolean;
	integrationKeyConfigurada: boolean;
	nomeescritorio: string | null;
	nomecliente: string | null;
	cnpjcliente: string | null;
	ultimoerro: string | null;
	ativadoem: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type DominioEnvioListagem = {
	id: string;
	idempresa: string;
	idnotafiscal: string;
	tipo: string;
	status: string;
	idloteapi: string | null;
	tentativas: number;
	proximatentativa: string | null;
	mensagemretorno: string | null;
	criadoem: string;
	atualizadoem: string;
	chavenfe: string | null;
	modelo: string | null;
	numeronotafiscal: string | null;
};
