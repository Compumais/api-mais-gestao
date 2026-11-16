-- Item LC 116/03 pode ter formato com ponto/subitem de 6 caracteres (ex.: 01.01, 14.01 ou 6 dígitos).
ALTER TABLE "produtos"
	ALTER COLUMN "codigolistalc11603" TYPE varchar(6);
