-- Regras operacionais nacionais de contingência para ST interna (54xx) e interestadual (64xx).
-- Garante que emissões não sejam bloqueadas por ausência de regra cadastrada manualmente para UFs distintas de MG.
INSERT INTO "regrafiscal" (
	"id", "rule_id", "descricao", "prioridade", "vigencia_inicio", "vigencia_fim",
	"condicoes", "resultado", "fontes", "status", "versao"
) VALUES
(
	'00000000-0000-4000-8000-000000000020',
	'NAC-ICMS-ST-INTERNA-54-GENERICA',
	'Nacional: ST para operação interna com CFOP 54xx (qualquer UF e regime)',
	50,
	'2020-01-01 00:00:00',
	NULL,
	'{"escopo":"operacao","cfop_prefixo":"54"}'::jsonb,
	'{"st_aplicavel":true,"fcp_aplicavel":false,"difal_aplicavel":false}'::jsonb,
	'[{"tipo":"Ajuste SINIEF / RICMS","orgao":"CONFAZ / SEFAZ","url":"https://www.confaz.fazenda.gov.br/","vigencia_inicio":"2020-01-01"}]'::jsonb,
	'validado',
	1
),
(
	'00000000-0000-4000-8000-000000000021',
	'NAC-ICMS-ST-INTERESTADUAL-64-GENERICA',
	'Nacional: ST para operação interestadual com CFOP 64xx (qualquer UF e regime)',
	50,
	'2020-01-01 00:00:00',
	NULL,
	'{"escopo":"operacao","cfop_prefixo":"64"}'::jsonb,
	'{"st_aplicavel":true,"fcp_aplicavel":false,"difal_aplicavel":false}'::jsonb,
	'[{"tipo":"Convenio ICMS / Ajuste SINIEF","orgao":"CONFAZ","url":"https://www.confaz.fazenda.gov.br/","vigencia_inicio":"2020-01-01"}]'::jsonb,
	'validado',
	1
)
ON CONFLICT ("rule_id") DO NOTHING;
