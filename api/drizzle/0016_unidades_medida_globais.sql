ALTER TABLE "unidademedida" ALTER COLUMN "idempresa" DROP NOT NULL;
--> statement-breakpoint
INSERT INTO "unidademedida" ("id", "idempresa", "codigo", "nome", "casasdecimais", "tipovalor", "currenttimemillis")
VALUES
	('a0000001-0000-4000-8000-000000000001', NULL, 'UN', 'Unidade', 0, 0, 0),
	('a0000001-0000-4000-8000-000000000002', NULL, 'KG', 'Quilograma', 3, 0, 0),
	('a0000001-0000-4000-8000-000000000003', NULL, 'G', 'Grama', 3, 0, 0),
	('a0000001-0000-4000-8000-000000000004', NULL, 'LT', 'Litro', 3, 0, 0),
	('a0000001-0000-4000-8000-000000000005', NULL, 'ML', 'Mililitro', 3, 0, 0),
	('a0000001-0000-4000-8000-000000000006', NULL, 'CX', 'Caixa', 0, 0, 0),
	('a0000001-0000-4000-8000-000000000007', NULL, 'PC', 'Peça', 0, 0, 0),
	('a0000001-0000-4000-8000-000000000008', NULL, 'M', 'Metro', 2, 0, 0),
	('a0000001-0000-4000-8000-000000000009', NULL, 'M2', 'Metro Quadrado', 2, 0, 0),
	('a0000001-0000-4000-8000-000000000010', NULL, 'M3', 'Metro Cúbico', 3, 0, 0)
ON CONFLICT ("id") DO NOTHING;
