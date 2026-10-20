ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "ativo" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "ultimoacesso" timestamp(3);
--> statement-breakpoint
UPDATE "empresas" e
SET "ultimoacesso" = sub.ultimo
FROM (
	SELECT idempresa, MAX(ultimo) AS ultimo
	FROM (
		SELECT ue.idempresa, s.criadoem::timestamp(3) AS ultimo
		FROM "usuario_empresas" ue
		INNER JOIN "sessoes" s ON s.idusuario = ue.idusuario
		UNION ALL
		SELECT emp.id AS idempresa, s.criadoem::timestamp(3) AS ultimo
		FROM "empresas" emp
		INNER JOIN "sessoes" s ON s.idusuario = emp.idproprietario
		UNION ALL
		SELECT al.idempresa, al.criadoem::timestamp(3) AS ultimo
		FROM "audit_logs" al
		WHERE al.idempresa IS NOT NULL
	) acessos
	GROUP BY idempresa
) sub
WHERE e.id = sub.idempresa
	AND e.ultimoacesso IS NULL;
