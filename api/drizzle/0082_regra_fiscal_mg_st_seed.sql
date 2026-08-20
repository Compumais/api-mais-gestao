-- Regras operacionais MG: ST interna (CFOP 54xx) para Simples Nacional.
-- Sem estas regras, o motor fiscal bloqueia emissões com CFOP 5401/5405 etc.
INSERT INTO "regrafiscal" (
	"id", "rule_id", "descricao", "prioridade", "vigencia_inicio", "vigencia_fim",
	"condicoes", "resultado", "fontes", "status", "versao"
) VALUES
(
	'00000000-0000-4000-8000-000000000010',
	'MG-ICMS-ST-22084000-001',
	'MG interna: ST para aguardente/cachaça (NCM 22084000) com CFOP 54xx',
	200,
	'2020-01-01 00:00:00',
	NULL,
	'{"escopo":"operacao","uf_emitente":"MG","uf_destinatario":"MG","ncm":"22084000","cfop_prefixo":"54","regime_tributario":"SN"}'::jsonb,
	'{"st_aplicavel":true,"fcp_aplicavel":false,"difal_aplicavel":false}'::jsonb,
	'[{"tipo":"RICMS/MG","orgao":"SEF/MG","url":"https://www.fazenda.mg.gov.br/","vigencia_inicio":"2020-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000011',
	'MG-ICMS-ST-SN-INTERNA-540-001',
	'MG interna: ST genérica para CFOP 54xx no Simples Nacional',
	100,
	'2020-01-01 00:00:00',
	NULL,
	'{"escopo":"operacao","uf_emitente":"MG","uf_destinatario":"MG","cfop_prefixo":"54","regime_tributario":"SN"}'::jsonb,
	'{"st_aplicavel":true,"fcp_aplicavel":false,"difal_aplicavel":false}'::jsonb,
	'[{"tipo":"RICMS/MG","orgao":"SEF/MG","url":"https://www.fazenda.mg.gov.br/","vigencia_inicio":"2020-01-01"}]'::jsonb,
	'validado',
	1
)
ON CONFLICT ("rule_id") DO NOTHING;
