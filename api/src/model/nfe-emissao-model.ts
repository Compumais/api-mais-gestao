import type { certificadodigital, empresafiscal, nfeconfiguracao, nfeserie } from "@/repositories/schema.js";

export type EmpresaFiscal = typeof empresafiscal.$inferSelect;
export type NovaEmpresaFiscal = typeof empresafiscal.$inferInsert;

export type CertificadoDigital = typeof certificadodigital.$inferSelect;
export type NovoCertificadoDigital = typeof certificadodigital.$inferInsert;

export type NfeConfiguracao = typeof nfeconfiguracao.$inferSelect;
export type NovaNfeConfiguracao = typeof nfeconfiguracao.$inferInsert;

export type NfeSerie = typeof nfeserie.$inferSelect;
export type NovaNfeSerie = typeof nfeserie.$inferInsert;

export type CertificadoDigitalResumo = Omit<
	CertificadoDigital,
	"arquivopfxcriptografado" | "senhacriptografada"
>;
