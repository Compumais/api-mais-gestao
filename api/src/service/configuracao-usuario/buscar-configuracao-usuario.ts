import type { HttpResponse } from "@/model/http-model";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories";
import {
	buscarConfiguracaoUsuario,
	type ConfiguracaoUsuario,
} from "@/repositories/configuracao-usuario-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

interface BuscarConfiguracaoUsuarioParametros {
	idusuario: string;
	idempresa?: string;
}

export async function buscarConfiguracaoUsuarioService({
	idusuario,
	idempresa,
}: BuscarConfiguracaoUsuarioParametros): Promise<
	HttpResponse<ConfiguracaoUsuario | null>
> {
	let idusuarioParaBuscar = idusuario;

	// Se idempresa for fornecido, buscar configurações do proprietário da empresa
	if (idempresa) {
		// Verificar que o usuário pertence à empresa
		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}

		// Buscar a empresa para obter o idproprietario
		const empresa = await buscarEmpresaPorId(idempresa);

		if (!empresa) {
			return httpNaoEncontrado();
		}

		// Usar o idproprietario para buscar as configurações
		idusuarioParaBuscar = empresa.idproprietario;
	}

	// Buscar configurações do usuário (próprio ou proprietário da empresa)
	const configuracao = await buscarConfiguracaoUsuario(idusuarioParaBuscar);

	// Retornar null se não existir (não é erro, apenas não configurado ainda)
	return httpOk(configuracao || null);
}

