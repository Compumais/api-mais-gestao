-- NFS-e: discriminação do serviço pode ultrapassar 120 caracteres.
ALTER TABLE "notafiscalitem"
	ALTER COLUMN "descricao" TYPE varchar(255);
