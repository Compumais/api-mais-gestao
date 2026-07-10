-- Backfill de codigo dos DAVs (pedidos) sem codigo.
-- Sequencial por empresa, a partir do MAX(codigo) existente,
-- ordenado por data de inclusão / currenttimemillis.

WITH ranked AS (
	SELECT
		id,
		idempresa,
		ROW_NUMBER() OVER (
			PARTITION BY idempresa
			ORDER BY
				COALESCE(currenttimemillis, 0) ASC,
				datainclusao ASC NULLS LAST,
				id ASC
		) AS rn
	FROM dav
	WHERE codigo IS NULL
),
bases AS (
	SELECT
		idempresa,
		COALESCE(MAX(codigo), 0) AS base
	FROM dav
	GROUP BY idempresa
)
UPDATE dav AS d
SET codigo = b.base + r.rn
FROM ranked AS r
INNER JOIN bases AS b ON b.idempresa = r.idempresa
WHERE d.id = r.id;
