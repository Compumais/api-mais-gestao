-- Remove coluna acidental criada por importação CSV incorreta.
-- A coluna fantasma (nome com ";") não faz parte do schema e costuma ser integer,
-- sem os dados reais dos produtos — estes já estão em codigo, nome, preco, etc.

DO $$
DECLARE
	col_csv text;
BEGIN
	SELECT c.column_name
	INTO col_csv
	FROM information_schema.columns c
	WHERE c.table_schema = 'public'
		AND c.table_name = 'produtos'
		AND c.column_name LIKE '%;%'
	LIMIT 1;

	IF col_csv IS NULL THEN
		RAISE NOTICE 'Nenhuma coluna CSV fantasma encontrada em produtos.';
		RETURN;
	END IF;

	RAISE NOTICE 'Removendo coluna fantasma: %', col_csv;

	EXECUTE format('ALTER TABLE produtos DROP COLUMN %I', col_csv);

	RAISE NOTICE 'Coluna removida com sucesso.';
END $$;
