-- Amplia campos de endereço/nome da entidade (limites antigos rejeitavam CEP mascarado e logradouros longos).
ALTER TABLE "entidade" ALTER COLUMN "nome" TYPE varchar(120);
ALTER TABLE "entidade" ALTER COLUMN "razaosocial" TYPE varchar(120);
ALTER TABLE "entidade" ALTER COLUMN "endereco" TYPE varchar(120);
ALTER TABLE "entidade" ALTER COLUMN "numeroendereco" TYPE varchar(20);
ALTER TABLE "entidade" ALTER COLUMN "complemento" TYPE varchar(60);
ALTER TABLE "entidade" ALTER COLUMN "bairro" TYPE varchar(60);
ALTER TABLE "entidade" ALTER COLUMN "cep" TYPE varchar(9);
