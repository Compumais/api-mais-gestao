import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarContabilidadeEmpresa,
	buscarContabilidadePorEmpresa,
	criarContabilidadeEmpresa,
	type ContabilidadeEmpresa,
} from "@/repositories/contabilidade-empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido, httpBadRequest } from "@/util/http-util.js";

type SalvarContabilidadeParametros = {
	idusuario: string;
	idempresa: string;
	nome: string;
	cnpj?: string | null;
	emailprincipal: string;
	emailsadicionais?: string[] | null;
	ativo?: boolean;
};

function normalizarEmails(emails: string[] | null | undefined): string[] | null {
	if (!emails?.length) return null;
	const unicos = [
		...new Set(
			emails
				.map((e) => e.trim().toLowerCase())
				.filter((e) => e.includes("@")),
		),
	];
	return unicos.length > 0 ? unicos : null;
}

export async function buscarContabilidadeCadastroService({
	idusuario,
	idempresa,
}: {
	idusuario: string;
	idempresa: string;
}): Promise<HttpResponse<ContabilidadeEmpresa | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const registro = await buscarContabilidadePorEmpresa(idempresa);
	return httpOk(registro ?? null);
}

export async function salvarContabilidadeCadastroService({
	idusuario,
	idempresa,
	nome,
	cnpj,
	emailprincipal,
	emailsadicionais,
	ativo = true,
}: SalvarContabilidadeParametros): Promise<HttpResponse<ContabilidadeEmpresa>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const nomeTrim = nome.trim();
	const emailTrim = emailprincipal.trim().toLowerCase();
	if (!nomeTrim || !emailTrim.includes("@")) {
		return httpBadRequest("Nome e e-mail principal são obrigatórios");
	}

	const agora = new Date().toISOString();
	const emailsNorm = normalizarEmails(emailsadicionais)?.filter(
		(e) => e !== emailTrim,
	);

	const existente = await buscarContabilidadePorEmpresa(idempresa);

	if (existente) {
		const atualizado = await atualizarContabilidadeEmpresa(existente.id, {
			nome: nomeTrim,
			cnpj: cnpj?.trim() || null,
			emailprincipal: emailTrim,
			emailsadicionais: emailsNorm ?? null,
			ativo,
			atualizadoem: agora,
		});

		if (!atualizado) {
			return httpBadRequest("Não foi possível atualizar o cadastro");
		}

		return httpOk(atualizado);
	}

	const criado = await criarContabilidadeEmpresa({
		id: uuidv4(),
		idempresa,
		nome: nomeTrim,
		cnpj: cnpj?.trim() || null,
		emailprincipal: emailTrim,
		emailsadicionais: emailsNorm ?? null,
		ativo,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!criado) {
		return httpBadRequest("Não foi possível salvar o cadastro");
	}

	return httpOk(criado);
}
