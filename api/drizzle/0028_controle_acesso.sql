-- Controle de acesso em nível de banco: alterações em perfil e vínculos usuario_empresas
-- exigem contexto privilegiado via set_config('app.controle_acesso_autorizado', 'true', true).
-- Seeds/migrations manuais devem usar o mesmo contexto ou role com bypass documentado.

CREATE OR REPLACE FUNCTION acesso_contexto_autorizado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT current_setting('app.controle_acesso_autorizado', true) = 'true';
$$;

CREATE OR REPLACE FUNCTION trg_bloquear_alteracao_perfil_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	IF NOT acesso_contexto_autorizado() THEN
		RAISE EXCEPTION 'CONTROLE_ACESSO_NAO_AUTORIZADO';
	END IF;

	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_bloquear_alteracao_usuario_empresas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	IF NOT acesso_contexto_autorizado() THEN
		RAISE EXCEPTION 'CONTROLE_ACESSO_NAO_AUTORIZADO';
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_perfil ON usuarios;
CREATE TRIGGER trg_usuarios_perfil
BEFORE UPDATE OF perfil ON usuarios
FOR EACH ROW
EXECUTE FUNCTION trg_bloquear_alteracao_perfil_usuarios();

DROP TRIGGER IF EXISTS trg_usuario_empresas ON usuario_empresas;
CREATE TRIGGER trg_usuario_empresas
BEFORE INSERT OR UPDATE OR DELETE ON usuario_empresas
FOR EACH ROW
EXECUTE FUNCTION trg_bloquear_alteracao_usuario_empresas();

REVOKE ALL ON FUNCTION acesso_contexto_autorizado() FROM PUBLIC;
REVOKE ALL ON FUNCTION trg_bloquear_alteracao_perfil_usuarios() FROM PUBLIC;
REVOKE ALL ON FUNCTION trg_bloquear_alteracao_usuario_empresas() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION acesso_contexto_autorizado() TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION trg_bloquear_alteracao_perfil_usuarios() TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION trg_bloquear_alteracao_usuario_empresas() TO CURRENT_USER;
