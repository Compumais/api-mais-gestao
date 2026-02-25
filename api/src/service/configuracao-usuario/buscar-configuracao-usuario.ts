import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarConfiguracaoUsuario,
	type ConfiguracaoUsuario,
} from "@/repositories/configuracao-usuario-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

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
	if (!configuracao) {
		return httpOk<ConfiguracaoUsuario | null>(null);
	}

	return httpOk<ConfiguracaoUsuario>({
		id: configuracao.id,
		idusuario: configuracao.idusuario,
		integracoes: configuracao.integracoes ?? {},
		criadoem: configuracao.criadoem ?? "",
		atualizadoem: configuracao.atualizadoem ?? "",
	});
}
