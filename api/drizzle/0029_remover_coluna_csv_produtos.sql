-- Remove coluna acidental criada por importação CSV com delimitador incorreto.
-- O nome da coluna é o cabeçalho da planilha (ex.: "Código;referencia;ean;nome;...").
-- Antes de remover, preenche colunas reais que estiverem vazias com os valores parseados.

DO $$
DECLARE
	col_csv text;
	tem_estoque boolean;
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

	SELECT EXISTS (
		SELECT 1
		FROM information_schema.columns c
		WHERE c.table_schema = 'public'
			AND c.table_name = 'produtos'
			AND c.column_name = 'estoque'
	)
	INTO tem_estoque;

	RAISE NOTICE 'Migrando dados da coluna CSV: %', col_csv;

	IF tem_estoque THEN
		EXECUTE format(
			$sql$
			UPDATE produtos p
			SET
				codigo = COALESCE(
					p.codigo,
					NULLIF(trim(split_part(p.%1$I, ';', 1)), '')::integer
				),
				referencia = COALESCE(
					NULLIF(trim(p.referencia), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 2)), '')
				),
				ean = COALESCE(
					NULLIF(trim(p.ean), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 3)), '')
				),
				nome = COALESCE(
					NULLIF(trim(p.nome), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 4)), '')
				),
				descricao = COALESCE(
					NULLIF(trim(p.descricao), ''),
					LEFT(
						NULLIF(trim(split_part(p.%1$I, ';', 4)), ''),
						100
					)
				),
				unidademedida = COALESCE(
					NULLIF(trim(p.unidademedida), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 5)), '')
				),
				preco = COALESCE(
					p.preco,
					NULLIF(trim(split_part(p.%1$I, ';', 6)), '')::numeric
				),
				estoque = COALESCE(
					p.estoque,
					NULLIF(trim(split_part(p.%1$I, ';', 7)), '')::numeric
				),
				custoaquisicao = COALESCE(
					p.custoaquisicao,
					NULLIF(trim(split_part(p.%1$I, ';', 8)), '')::numeric
				)
			WHERE p.%1$I IS NOT NULL
				AND trim(p.%1$I) <> ''
			$sql$,
			col_csv
		);
	ELSE
		EXECUTE format(
			$sql$
			UPDATE produtos p
			SET
				codigo = COALESCE(
					p.codigo,
					NULLIF(trim(split_part(p.%1$I, ';', 1)), '')::integer
				),
				referencia = COALESCE(
					NULLIF(trim(p.referencia), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 2)), '')
				),
				ean = COALESCE(
					NULLIF(trim(p.ean), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 3)), '')
				),
				nome = COALESCE(
					NULLIF(trim(p.nome), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 4)), '')
				),
				descricao = COALESCE(
					NULLIF(trim(p.descricao), ''),
					LEFT(
						NULLIF(trim(split_part(p.%1$I, ';', 4)), ''),
						100
					)
				),
				unidademedida = COALESCE(
					NULLIF(trim(p.unidademedida), ''),
					NULLIF(trim(split_part(p.%1$I, ';', 5)), '')
				),
				preco = COALESCE(
					p.preco,
					NULLIF(trim(split_part(p.%1$I, ';', 6)), '')::numeric
				),
				custoaquisicao = COALESCE(
					p.custoaquisicao,
					NULLIF(trim(split_part(p.%1$I, ';', 8)), '')::numeric
				)
			WHERE p.%1$I IS NOT NULL
				AND trim(p.%1$I) <> ''
			$sql$,
			col_csv
		);
	END IF;

	EXECUTE format('ALTER TABLE produtos DROP COLUMN %I', col_csv);

	RAISE NOTICE 'Coluna CSV removida: %', col_csv;
END $$;
